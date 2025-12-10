import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sandVertexShader, sandFragmentShader } from '../utils/shaderUtils';

const CoastlineParticles: React.FC = () => {
  const meshRef = useRef<THREE.Points>(null);
  
  const particleCount = 15000;
  
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      // Create a long strip (coastline)
      const x = (Math.random() - 0.5) * 100; // Wide X
      const z = (Math.random() - 0.5) * 40;  // Depth
      
      // Y is slightly noisy flat ground
      const y = (Math.random() - 0.5) * 2 - 10; // Placed below memories
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      sizes[i] = Math.random() * 2.0;
    }
    
    return { positions, sizes };
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={particles.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={sandVertexShader}
        fragmentShader={sandFragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default CoastlineParticles;