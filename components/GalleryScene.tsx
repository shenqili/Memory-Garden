import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store';
import CoastlineParticles from './CoastlineParticles';
import ImageParticles from './ImageParticles';

const GalleryScene: React.FC = () => {
  const { camera, pointer } = useThree();
  const memories = useAppStore(state => state.memories);
  const loadMemory = useAppStore(state => state.loadMemory);
  
  // A group to hold the entire world, which we can move for "infinite scroll" feel
  // or we move the camera. Moving camera is easier for logic.
  const rigRef = useRef<THREE.Group>(null);
  
  // Camera target position
  const targetPos = useRef(new THREE.Vector3(0, 0, 15));
  
  useFrame((state, delta) => {
    // Mouse Navigation Logic:
    // If mouse is far from center X, move camera X.
    const speed = 15.0;
    const threshold = 0.2; // Deadzone in center
    
    if (Math.abs(pointer.x) > threshold) {
      // Normalize speed based on how far past threshold
      const direction = Math.sign(pointer.x);
      const intensity = (Math.abs(pointer.x) - threshold) / (1 - threshold);
      
      targetPos.current.x += direction * intensity * speed * delta;
    }
    
    // Smoothly interpolate camera position
    state.camera.position.lerp(targetPos.current, 2.0 * delta);
    state.camera.lookAt(targetPos.current.x, 0, 0); // Always look forward/center relative to movement
  });

  return (
    <>
      <CoastlineParticles />
      
      {/* Render Memories positioned in 3D */}
      <group>
        {memories.map((mem, index) => (
          <group 
            key={mem.id} 
            position={mem.position ? new THREE.Vector3(...mem.position) : new THREE.Vector3(index * 12, 0, 0)}
            rotation={mem.rotation ? new THREE.Euler(...mem.rotation) : new THREE.Euler(0, 0, 0)}
            scale={mem.scale ? new THREE.Vector3(...mem.scale) : new THREE.Vector3(1, 1, 1)}
            onClick={(e) => {
              e.stopPropagation();
              loadMemory(mem.id);
            }}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
             {/* Text Label above memory */}
             {/* 
             <Text 
                position={[0, 6, 0]} 
                fontSize={0.5} 
                color="white" 
                anchorX="center" 
                anchorY="middle"
              >
                {mem.date}
              </Text>
              */}
              
             {/* The Image Particle System */}
             {/* We use a smaller scale for gallery view to fit scene */}
             <group scale={[0.5, 0.5, 0.5]}>
                <ImageParticles imageSrc={mem.imageSrc} isInteractive={false} />
             </group>
          </group>
        ))}
      </group>
    </>
  );
};

export default GalleryScene;