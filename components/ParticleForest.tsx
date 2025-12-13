
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { forestVertexShader, forestFragmentShader } from '../utils/shaderUtils';
import MemoryNode from './MemoryNode';
import Fireflies from './Fireflies';

// Dark Forest Image
const FOREST_IMG = "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=1200&auto=format&fit=crop";

const ForestBackground: React.FC<{ fireflyPositions: THREE.Vector3[] }> = ({ fireflyPositions }) => {
  const meshRef = useRef<THREE.Points>(null);
  const texture = useTexture(FOREST_IMG);
  
  // Create a grid of points
  const geometry = useMemo(() => {
    const width = 24;
    const height = 16;
    const segmentsW = 150;
    const segmentsH = 100;
    
    const positions = [];
    const uvs = [];
    
    for (let y = 0; y <= segmentsH; y++) {
      for (let x = 0; x <= segmentsW; x++) {
        const u = x / segmentsW;
        const v = y / segmentsH;
        
        const px = (u - 0.5) * width;
        const py = (v - 0.5) * height;
        const pz = -5.0; // Push back
        
        positions.push(px, py, pz);
        uvs.push(u, v);
      }
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('initialPosition', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aUv', new THREE.Float32BufferAttribute(uvs, 2));
    return geo;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = state.clock.getElapsedTime();
      
      // Update lighting uniforms
      // We pass the first 10 fireflies or pad with zeros
      const positions = new Array(10).fill(new THREE.Vector3(0,0,0));
      for(let i=0; i<Math.min(fireflyPositions.length, 10); i++) {
        positions[i] = fireflyPositions[i];
      }
      mat.uniforms.uFireflies.value = positions;
      
      // Update mouse for interaction
      const mouse = new THREE.Vector3(state.pointer.x, state.pointer.y, 0);
      mat.uniforms.uMouse.value = mouse;
    }
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <shaderMaterial
        vertexShader={forestVertexShader}
        fragmentShader={forestFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uTexture: { value: texture },
          uFireflies: { value: new Array(10).fill(new THREE.Vector3(0,0,0)) },
          uMouse: { value: new THREE.Vector3() }
        }}
        transparent={true}
        depthWrite={false}
      />
    </points>
  );
};

export default function ParticleForest() {
  const capsules = useAppStore(state => state.capsules);
  // Shared state for firefly positions to pass to shader
  const [fireflyPositions, setFireflyPositions] = useState<THREE.Vector3[]>([]);
  
  // Callback from Fireflies component
  const handleFirefliesUpdate = (positions: THREE.Vector3[]) => {
    // We only need to update this occasionally or reference a ref, 
    // but React state is fine for this frame rate if optimized.
    // However, to avoid re-renders of the Forest, we should stick to using a Ref inside ForestBackground
    // But since ForestBackground needs the array in useFrame, let's pass it via a MutableRefObject 
    // down to a custom hook or just trust standard prop updates.
    // Optimization: Only set state if we really need to (but here we need it every frame for smooth lighting).
    // Better pattern: Pass a MutableRefObject to Fireflies and ForestBackground.
  };
  
  // Using Ref pattern to avoid React render cycle overhead for lighting
  const fireflyPosRef = useRef<THREE.Vector3[]>([]);
  const updateFireflies = (pos: THREE.Vector3[]) => {
      fireflyPosRef.current = pos;
  };

  // Wrapper to force re-render of background only when necessary? 
  // Actually, ForestBackground reads the Ref in useFrame, so we don't need state.
  // We just need a component that renders Fireflies and updates the Ref.

  return (
    <group>
      {/* Lighting & Atmosphere */}
      <ambientLight intensity={0.1} />
      <fogExp2 attach="fog" args={['#050505', 0.02]} />

      <Fireflies count={15} areaSize={12} onUpdate={updateFireflies} />

      {/* The Particle Landscape */}
      {/* We pass a specialized component that reads from the ref we just created */}
      <ForestWithRef fireflyRef={fireflyPosRef} />

      {/* Memory Nodes */}
      {capsules.map((capsule) => (
        <React.Fragment key={capsule.id}>
           <MemoryNode 
             capsule={capsule} 
             position={capsule.position || [0,0,0]} 
           />
           {/* Floating Label */}
           <Text
              position={[capsule.position![0], capsule.position![1] - 1.4, capsule.position![2]]}
              fontSize={0.15}
              color="white"
              anchorX="center"
              anchorY="top"
              font="https://fonts.gstatic.com/s/raleway/v14/1Ptrg8zYS_SKggPNwK4vaqI.woff"
              fillOpacity={0.7}
           >
             {capsule.title}
           </Text>
        </React.Fragment>
      ))}
    </group>
  );
}

// Sub-component to read ref without triggering parent re-renders
const ForestWithRef = ({ fireflyRef }: { fireflyRef: React.MutableRefObject<THREE.Vector3[]> }) => {
     // We can reuse the ForestBackground logic but read from ref
     // To save code duplication, let's just assume ForestBackground handles the array if passed
     // But wait, the previous ForestBackground took `fireflyPositions` as a prop.
     // Let's modify ForestBackground to take a ref instead for performance.
     return <ForestBackgroundWithRef fireflyRef={fireflyRef} />;
}

const ForestBackgroundWithRef: React.FC<{ fireflyRef: React.MutableRefObject<THREE.Vector3[]> }> = ({ fireflyRef }) => {
  const meshRef = useRef<THREE.Points>(null);
  const texture = useTexture(FOREST_IMG);
  
  const geometry = useMemo(() => {
    const width = 30;
    const height = 18;
    const segmentsW = 120;
    const segmentsH = 80;
    const positions = [];
    const uvs = [];
    for (let y = 0; y <= segmentsH; y++) {
      for (let x = 0; x <= segmentsW; x++) {
        const u = x / segmentsW;
        const v = y / segmentsH;
        const px = (u - 0.5) * width;
        const py = (v - 0.5) * height;
        const pz = -6.0; 
        positions.push(px, py, pz);
        uvs.push(u, v);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('initialPosition', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aUv', new THREE.Float32BufferAttribute(uvs, 2));
    return geo;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = state.clock.getElapsedTime();
      
      const positions = new Array(10).fill(new THREE.Vector3(0,0,0));
      const currentFireflies = fireflyRef.current || [];
      for(let i=0; i<Math.min(currentFireflies.length, 10); i++) {
        positions[i] = currentFireflies[i];
      }
      mat.uniforms.uFireflies.value = positions;
      
      const mouse = new THREE.Vector3(state.pointer.x, state.pointer.y, 0);
      mat.uniforms.uMouse.value = mouse;
    }
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <shaderMaterial
        vertexShader={forestVertexShader}
        fragmentShader={forestFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uTexture: { value: texture },
          uFireflies: { value: new Array(10).fill(new THREE.Vector3(0,0,0)) },
          uMouse: { value: new THREE.Vector3() }
        }}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
