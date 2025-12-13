
import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { MemoryCapsule } from '../types';

// Noise functions for the shader
const noiseChunk = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
            -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Fractal Brownian Motion for clouds/fog
  float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * snoise(st);
      st *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
`;

const mirrorVertexShader = `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // Gentle floating breathing
    pos.z += sin(pos.x * 1.5 + uTime * 0.8) * 0.03;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const mirrorFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uHover;
  varying vec2 vUv;

  ${noiseChunk}

  void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    
    // 1. Oval Alpha Mask (Soft Edge)
    vec2 center = vec2(0.5);
    float dist = distance(vUv, center);
    float mask = 1.0 - smoothstep(0.42, 0.48, dist);
    
    // 2. Fog Logic
    // Create moving fog pattern
    float fogNoise = fbm(vUv * 3.0 + vec2(0.0, uTime * 0.15));
    float fogLayer = smoothstep(0.2, 0.9, fogNoise);
    
    // Calculate Hover influence
    // When Hover = 0: Fog is strong (opacity ~0.7)
    // When Hover = 1: Fog dissipates (opacity ~0.0)
    float fogOpacity = (1.0 - uHover) * 0.7;
    
    // 3. Image Processing
    // Desaturate image when foggy
    vec3 gray = vec3(dot(texColor.rgb, vec3(0.299, 0.587, 0.114)));
    vec3 baseColor = mix(gray, texColor.rgb, 0.4 + uHover * 0.6);
    
    // Mix Image with Fog Color (Bluish White)
    vec3 fogColor = vec3(0.85, 0.9, 0.95);
    vec3 finalColor = mix(baseColor, fogColor, fogLayer * fogOpacity);
    
    // Add subtle glow to the edge of the oval
    float edgeGlow = smoothstep(0.4, 0.45, dist) * (1.0 - smoothstep(0.45, 0.48, dist));
    finalColor += vec3(0.2, 0.2, 0.3) * edgeGlow * 2.0;

    gl_FragColor = vec4(finalColor, mask);
  }
`;

const MirrorItem: React.FC<{ 
  capsule: MemoryCapsule; 
  position: [number, number, number];
  onEnter: (id: string) => void;
}> = ({ capsule, position, onEnter }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(capsule.coverImage);
  const [hovered, setHover] = useState(false);
  const isTransitioning = useAppStore(state => state.isVisualTransitioning);

  // Update Shader Uniforms
  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
      // Smoothly interpolate hover state
      material.uniforms.uHover.value = THREE.MathUtils.lerp(
        material.uniforms.uHover.value,
        hovered && !isTransitioning ? 1.0 : 0.0,
        0.08
      );
    }
  });

  return (
    <group position={position}>
      {/* The Mirror Plane */}
      <mesh 
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
        onPointerOut={() => setHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          onEnter(capsule.id);
        }}
        scale={hovered ? 1.05 : 1.0}
      >
        <planeGeometry args={[3.2, 4.2, 32, 32]} />
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
      <group position={[0, -2.6, 0]}>
        <Text 
          fontSize={0.12} 
          color="#a0a0ff" 
          anchorX="center" 
          anchorY="middle"
          letterSpacing={0.2}
          fillOpacity={hovered ? 1 : 0.6}
        >
          {capsule.date.toUpperCase()}
        </Text>
        <Text 
          position={[0, -0.3, 0]}
          fontSize={0.22} 
          color="#ffffff" 
          anchorX="center" 
          anchorY="middle"
          fillOpacity={hovered ? 1 : 0.8}
        >
          {capsule.title}
        </Text>
      </group>

      {/* Localized Light for this mirror (Dimmer now due to fog self-emission) */}
      <pointLight 
        position={[0, 0, 2]} 
        intensity={hovered ? 3 : 0.5} 
        distance={5} 
        color="#ffffff" 
      />
    </group>
  );
};

const Mirrors = ({ onEnter }: { onEnter: (id: string) => void }) => {
  const capsules = useAppStore(state => state.capsules);
  const width = 5.5; 
  
  return (
    <group position={[0, 0, 0]}>
      {capsules.map((capsule, index) => (
        <MirrorItem 
          key={capsule.id} 
          capsule={capsule} 
          position={[index * width, 0, 0]} 
          onEnter={onEnter}
        />
      ))}
    </group>
  );
};

const CorridorScene: React.FC<{ onEnterMemory: (id: string) => void }> = ({ onEnterMemory }) => {
  return (
    <group>
      {/* Deep Fog for the corridor depth */}
      <fogExp2 attach="fog" args={['#020202', 0.04]} />
      
      <ambientLight intensity={0.2} />
      
      <Mirrors onEnter={onEnterMemory} />
    </group>
  );
};

export default function MirrorCorridor() {
  const triggerEnterMemory = useAppStore(state => state.triggerEnterMemory);
  const capsules = useAppStore(state => state.capsules);

  return (
    <ScrollControls horizontal damping={0.2} pages={Math.max(2, capsules.length * 0.9)}>
      <Scroll>
        <CorridorScene onEnterMemory={triggerEnterMemory} />
      </Scroll>
    </ScrollControls>
  );
}
