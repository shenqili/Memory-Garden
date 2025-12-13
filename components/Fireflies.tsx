
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FirefliesProps {
  count?: number;
  areaSize?: number;
  onUpdate?: (positions: THREE.Vector3[]) => void;
}

const Fireflies: React.FC<FirefliesProps> = ({ count = 10, areaSize = 10, onUpdate }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Initial random positions and velocities
  const data = useMemo(() => {
    const positions = [];
    const velocities = [];
    const offsets = []; // For sine wave motion
    
    for (let i = 0; i < count; i++) {
      positions.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * areaSize,
          (Math.random() - 0.5) * areaSize * 0.5, // Less vertical spread
          (Math.random() - 0.5) * areaSize * 0.5
        )
      );
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        )
      );
      offsets.push(Math.random() * 100);
    }
    return { positions, velocities, offsets };
  }, [count, areaSize]);

  // Temp object for matrix updates
  const dummy = new THREE.Object3D();
  const currentPositions = useRef<THREE.Vector3[]>(data.positions);

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    
    data.positions.forEach((pos, i) => {
      // Update position
      pos.add(data.velocities[i]);
      
      // Add organic sine wave motion
      pos.y += Math.sin(time + data.offsets[i]) * 0.005;

      // Bound checks (soft bounce)
      if (Math.abs(pos.x) > areaSize / 2) data.velocities[i].x *= -1;
      if (Math.abs(pos.y) > areaSize / 4) data.velocities[i].y *= -1;
      if (Math.abs(pos.z) > areaSize / 4) data.velocities[i].z *= -1;

      // Update Instance Matrix
      dummy.position.copy(pos);
      // Breathing scale
      const scale = 1.0 + Math.sin(time * 5 + data.offsets[i]) * 0.3;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      
      // Update storage for callback
      currentPositions.current[i] = pos;
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    
    // Pass positions up for lighting
    if (onUpdate) {
      onUpdate(currentPositions.current);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.03, 8, 8]} />
      <meshBasicMaterial color="#ffffaa" toneMapped={false} />
    </instancedMesh>
  );
};

export default Fireflies;
