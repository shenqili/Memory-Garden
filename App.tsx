import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ImageParticles from './components/ImageParticles';
import MemoryCorridor from './components/MemoryCorridor';
import { Leva } from 'leva';
import * as THREE from 'three';
import { useAppStore } from './store';
import { AnimatePresence } from 'framer-motion';

// UI Components
import PhaseChat from './components/PhaseChat';
import PhaseGallery from './components/PhaseGallery';

// Post-processing imports
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const Effects: React.FC = () => {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const afterimagePass = new AfterimagePass();
    afterimagePass.uniforms['damp'].value = 0.7; // Moderate trails
    composer.addPass(afterimagePass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height), 
      0.4, // Strength
      0.5, // Radius
      0.8  // Threshold
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);
    composerRef.current = composer;

    return () => { composer.dispose(); };
  }, [gl, scene, camera, size]);

  useFrame(() => {
    if (composerRef.current) {
      gl.autoClear = false; 
      composerRef.current.render();
    }
  }, 1);

  return null;
};

const UIOverlay = () => {
  const phase = useAppStore(state => state.phase);
  const setPhase = useAppStore(state => state.setPhase);
  const setCurrentMemory = useAppStore(state => state.setCurrentMemory);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      // Create a temporary memory for the session
      setCurrentMemory({
        id: 'temp',
        images: [url], // New array structure
        date: new Date().toLocaleDateString(),
        text: ''
      });
      setPhase('CHATTING');
    }
  };

  return (
    <>
      {/* Header */}
      <div className="absolute top-0 left-0 p-6 z-50 w-full pointer-events-none flex justify-between">
        <div>
          <h1 className="text-2xl font-light text-white tracking-widest uppercase opacity-90 drop-shadow-md cursor-pointer" onClick={() => setPhase('IDLE')}>
            MIAOMIAO GUO's MEMORY CORRIDOR
          </h1>
        </div>
        
        {phase === 'IDLE' && (
           <div className="pointer-events-auto bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full cursor-pointer hover:bg-white/20 transition">
             <label className="cursor-pointer text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
               <span>+ Upload Memory</span>
               <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
             </label>
           </div>
        )}
      </div>

      {/* Dynamic Phase Content */}
      <AnimatePresence mode='wait'>
        {phase === 'CHATTING' && <PhaseChat key="chat" />}
        {(phase === 'GALLERY' || phase === 'IDLE') && <PhaseGallery key="gallery" />}
      </AnimatePresence>
    </>
  );
};

const App: React.FC = () => {
  const currentMemory = useAppStore(state => state.currentMemory);
  const phase = useAppStore(state => state.phase);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
          <color attach="background" args={['#050505']} />
          <fog attach="fog" args={['#000000', 5, 25]} /> {/* Atmospheric fog */}
          
          {phase === 'IDLE' ? (
             <MemoryCorridor />
          ) : (
             currentMemory && <ImageParticles quality="high" imageSrc={currentMemory.images[0]} />
          )}

          <Effects />
          
          {phase !== 'IDLE' && (
             <OrbitControls 
                enableZoom={true} 
                enablePan={false} 
                enableRotate={true}
                maxDistance={20}
                minDistance={4}
                maxPolarAngle={Math.PI / 1.5}
                minPolarAngle={Math.PI / 3}
             />
          )}
        </Canvas>
      </div>

      <UIOverlay />

      <Leva 
        theme={{
          colors: { accent: '#ffffff', bg: '#1a1a1a', textColor: '#f0f0f0', labelColor: '#888' },
        }}
        collapsed={true} // Hide by default for production feel
      />
    </div>
  );
};

export default App;