
import React, { useMemo, useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MemoryCapsule } from '../types';
import { sphereVertexShader, sphereFragmentShader } from '../utils/shaderUtils';
import { useAppStore } from '../store';

interface MemoryNodeProps {
  capsule: MemoryCapsule;
  position: [number, number, number];
}

const MemoryNode: React.FC<MemoryNodeProps> = ({ capsule, position }) => {
  const [pointsGeometry, setPointsGeometry] = useState<THREE.BufferGeometry | null>(null);
  const meshRef = useRef<THREE.Points>(null);
  const triggerEnterMemory = useAppStore(state => state.triggerEnterMemory);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = capsule.coverImage;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Low resolution is sufficient for the sphere
      canvas.width = 100; 
      canvas.height = 100;
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Generate points on sphere
      const particleCount = 3000;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const radius = 0.8;

      for (let i = 0; i < particleCount; i++) {
        // Fibonacci Sphere Algorithm for even distribution
        const phi = Math.acos(1 - 2 * (i + 0.5) / particleCount);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Map Sphere Point to UV
        // Normalized x,y,z on unit sphere (already normalized if radius=1, but here radius=0.8)
        const nx = x / radius;
        const ny = y / radius;
        const nz = z / radius;

        // Spherical mapping
        const u = 0.5 + (Math.atan2(nz, nx) / (2 * Math.PI));
        const v = 0.5 - (Math.asin(ny) / Math.PI);

        // Sample color
        const pixelX = Math.floor(u * canvas.width);
        const pixelY = Math.floor(v * canvas.height);
        const index = (pixelY * canvas.width + pixelX) * 4;

        colors[i * 3] = data[index] / 255;
        colors[i * 3 + 1] = data[index + 1] / 255;
        colors[i * 3 + 2] = data[index + 2] / 255;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      setPointsGeometry(geometry);
    };
  }, [capsule.coverImage]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  if (!pointsGeometry) return null;

  return (
    <group position={position}>
      {/* Clickable Invisible Hit Box */}
      <mesh 
        onClick={(e) => {
          e.stopPropagation();
          const worldPos = new THREE.Vector3(...position);
          triggerEnterMemory(capsule.id, worldPos);
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        visible={false}
      >
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshBasicMaterial />
      </mesh>

      {/* Visual Particle Sphere */}
      <points ref={meshRef}>
        <primitive object={pointsGeometry} attach="geometry" />
        <shaderMaterial
          vertexShader={sphereVertexShader}
          fragmentShader={sphereFragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uPulseSpeed: { value: 1.0 + Math.random() }
          }}
          transparent={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* Title Text */}
      <group position={[0, -1.2, 0]}>
         {/* Billboard behavior: Look at camera */}
         <mesh
           onBeforeRender={(renderer, scene, camera) => {
             meshRef.current?.quaternion.copy(camera.quaternion);
           }}
         >
             {/* Not implemented strictly here, using simple rotation usually or Billboard component */}
         </mesh>
      </group>
    </group>
  );
};

export default MemoryNode;
