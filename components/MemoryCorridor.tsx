import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import ImageParticles from './ImageParticles';
import { Memory } from '../types';

const MemoryCorridor: React.FC = () => {
  const memories = useAppStore(state => state.memories);
  const setCurrentMemory = useAppStore(state => state.setCurrentMemory);
  const setPhase = useAppStore(state => state.setPhase);
  const groupRef = useRef<THREE.Group>(null);

  const handleEnterMemory = (memory: Memory) => {
    setCurrentMemory(memory);
    setPhase('CHATTING');
  };

  useFrame(({ mouse, camera }) => {
    // Parallax Effect
    // Map mouse X (-1 to 1) to camera/group movement
    // We move the camera along X to create the sensation of sliding down the corridor
    if (memories.length > 1) {
       const maxOffset = (memories.length * 6) / 2;
       const targetX = mouse.x * maxOffset;
       camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.05);
       
       // Subtle look at effect
       camera.lookAt(targetX * 0.5, 0, 0);
    }
  });

  return (
    <group ref={groupRef}>
      {memories.map((mem, index) => {
        // Position memories along the X axis
        const spacing = 8;
        const xPos = (index - (memories.length - 1) / 2) * spacing;

        return (
          <group key={mem.id} position={[xPos, 0, 0]}>
            <Text
              position={[0, 4.5, 0]}
              fontSize={0.5}
              color="white"
              anchorX="center"
              anchorY="middle"
              font="https://fonts.gstatic.com/s/raleway/v14/1Ptrg8zYS_SKggPNwK4vaqI.woff"
            >
              {mem.date}
            </Text>
            
            <ImageParticles 
              imageSrc={mem.images[0]} 
              quality="low" 
              scale={0.6}
              onClick={() => handleEnterMemory(mem)}
            />
          </group>
        );
      })}
    </group>
  );
};

export default MemoryCorridor;