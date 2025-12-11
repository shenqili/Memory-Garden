
import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Text, useTexture, Image as DreiImage } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { MemoryCapsule } from '../types';

// Custom Shader for the "Particle Mirror" effect
const mirrorVertexShader = `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // Slight breathing animation
    pos.z += sin(pos.x * 2.0 + uTime) * 0.05;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const mirrorFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uHover;
  varying vec2 vUv;

  // Simple noise function
  float rand(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
  }

  void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    
    // 1. Oval Alpha Mask
    vec2 center = vec2(0.5);
    float dist = distance(vUv, center);
    // Smooth edges for the oval
    float mask = 1.0 - smoothstep(0.4, 0.5, dist);
    
    // 2. Grain/Noise Effect (Dormant Particles)
    float grain = rand(vUv * 20.0 + uTime * 0.5) * 0.15;
    
    // 3. Desaturation based on hover state
    vec3 gray = vec3(dot(texColor.rgb, vec3(0.299, 0.587, 0.114)));
    vec3 finalColor = mix(gray, texColor.rgb, 0.3 + uHover * 0.7);
    
    // Add grain and a slight shimmer
    finalColor += grain * (0.1 + uHover * 0.1);
    
    gl_FragColor = vec4(finalColor, mask * (0.8 + uHover * 0.2));
  }
`;

const MirrorItem: React.FC<{ 
  capsule: MemoryCapsule; 
  position: [number, number, number];
  index: number;
  onEnter: (id: string, position: THREE.Vector3) => void;
}> = ({ capsule, position, onEnter }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(capsule.coverImage);
  const [hovered, setHover] = useState(false);
  
  // Update Shader Uniforms
  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
      material.uniforms.uHover.value = THREE.MathUtils.lerp(
        material.uniforms.uHover.value,
        hovered ? 1.0 : 0.0,
        0.1
      );
    }
  });

  return (
    <group position={position}>
      {/* The Mirror Plane */}
      <mesh 
        ref={meshRef}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          const worldPos = new THREE.Vector3();
          meshRef.current?.getWorldPosition(worldPos);
          onEnter(capsule.id, worldPos);
        }}
        scale={hovered ? 1.1 : 1.0}
      >
        <planeGeometry args={[3, 4, 32, 32]} />
        <shaderMaterial 
          vertexShader={mirrorVertexShader}
          fragmentShader={mirrorFragmentShader}
          uniforms={{
            uTexture: { value: texture },
            uTime: { value: 0 },
            uHover: { value: 0 }
          }}
          transparent={true}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating Text below */}
      <group position={[0, -2.5, 0]}>
        <Text 
          fontSize={0.15} 
          color="#ffffff" 
          anchorX="center" 
          anchorY="middle"
          letterSpacing={0.1}
          fillOpacity={0.8}
        >
          {capsule.date.toUpperCase()}
        </Text>
        <Text 
          position={[0, -0.25, 0]}
          fontSize={0.25} 
          color="#ffffff" 
          anchorX="center" 
          anchorY="middle"
        >
          {capsule.title}
        </Text>
      </group>

      {/* Localized Light for this mirror */}
      {hovered && (
        <pointLight position={[0, 0, 2]} intensity={4} distance={6} color="#c0c0ff" />
      )}
    </group>
  );
};

const Mirrors = ({ onEnter }: { onEnter: (id: string, pos: THREE.Vector3) => void }) => {
  const capsules = useAppStore(state => state.capsules);
  const width = 5; 
  
  return (
    <group position={[0, 0, 0]}>
      {capsules.map((capsule, index) => (
        <MirrorItem 
          key={capsule.id} 
          capsule={capsule} 
          index={index}
          position={[index * width, 0, 0]} 
          onEnter={onEnter}
        />
      ))}
    </group>
  );
};

const CorridorScene: React.FC<{ onEnterMemory: (id: string, pos: THREE.Vector3) => void }> = ({ onEnterMemory }) => {
  const scroll = useScroll();
  
  useFrame((state, delta) => {
    // Optional: Add subtle parallax or movement
  });

  return (
    <group>
      {/* Reduced fog density to ensure visibility */}
      <fogExp2 attach="fog" args={['#050505', 0.05]} />
      
      {/* Increased ambient light */}
      <ambientLight intensity={0.5} />
      
      <spotLight 
        position={[0, 10, 5]} 
        angle={0.5} 
        penumbra={1} 
        intensity={2} 
        color="#a0a0ff" 
      />

      <Mirrors onEnter={onEnterMemory} />
    </group>
  );
};

export default function MirrorCorridor() {
  const enterMemory = useAppStore(state => state.enterMemory);
  const capsules = useAppStore(state => state.capsules);

  const handleEnter = (id: string, worldPos: THREE.Vector3) => {
     enterMemory(id);
  };

  return (
    <ScrollControls horizontal damping={0.2} pages={Math.max(2, capsules.length * 0.8)}>
      <Scroll>
        <CorridorScene onEnterMemory={handleEnter} />
      </Scroll>
    </ScrollControls>
  );
}
