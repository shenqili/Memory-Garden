
import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Loader } from '@react-three/drei';
import ImageParticles from './components/ImageParticles';
import MirrorCorridor from './components/MirrorCorridor';
import { Leva } from 'leva';
import * as THREE from 'three';
import { useAppStore } from './store';
import { AnimatePresence, motion } from 'framer-motion';

// UI Components
import PhaseChat from './components/PhaseChat';

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
    afterimagePass.uniforms['damp'].value = 0.7; 
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

// Controls the camera transition between modes
const CameraManager = () => {
  const viewMode = useAppStore(state => state.viewMode);
  const vec = new THREE.Vector3();

  useFrame((state) => {
    if (viewMode === 'CORRIDOR') {
      state.camera.position.lerp(vec.set(0, 0, 6), 0.05);
      state.camera.lookAt(0, 0, 0);
    } 
  });

  return null;
};

const UIOverlay = () => {
  const viewMode = useAppStore(state => state.viewMode);
  const currentCapsule = useAppStore(state => state.currentCapsule);
  const currentFragmentIndex = useAppStore(state => state.currentFragmentIndex);
  const exitMemory = useAppStore(state => state.exitMemory);
  const nextFragment = useAppStore(state => state.nextFragment);
  const prevFragment = useAppStore(state => state.prevFragment);

  const fragments = currentCapsule?.fragments || [];
  const hasMultipleFragments = fragments.length > 1;

  return (
    <>
      {/* Header */}
      <div className="absolute top-0 left-0 p-6 z-50 w-full pointer-events-none flex justify-between">
        <div>
          <h1 className="text-2xl font-light text-white tracking-widest uppercase opacity-90 drop-shadow-md">
            Memory Garden
          </h1>
          <p className="text-xs text-white/50 tracking-[0.3em] mt-1">
             {viewMode === 'CORRIDOR' ? 'Mirror Corridor' : currentCapsule?.title}
          </p>
        </div>
        
        {viewMode === 'GARDEN' && (
           <button 
             onClick={exitMemory}
             className="pointer-events-auto bg-white/5 backdrop-blur-md border border-white/20 px-6 py-2 rounded-full cursor-pointer hover:bg-white/20 transition text-xs font-bold text-white uppercase tracking-wider"
           >
             Return to Corridor
           </button>
        )}
      </div>

      {/* Navigation for Garden Mode */}
      <AnimatePresence>
        {viewMode === 'GARDEN' && (
          <>
            <PhaseChat key="chat" />
            
            {/* Left/Right Navigation */}
            {hasMultipleFragments && (
              <>
                <div className="absolute top-1/2 left-4 -translate-y-1/2 z-40">
                  <button 
                    onClick={prevFragment}
                    className="p-4 rounded-full bg-white/5 hover:bg-white/20 border border-white/10 backdrop-blur transition-all pointer-events-auto"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>
                <div className="absolute top-1/2 right-4 -translate-y-1/2 z-40">
                   <button 
                    onClick={nextFragment}
                    className="p-4 rounded-full bg-white/5 hover:bg-white/20 border border-white/10 backdrop-blur transition-all pointer-events-auto"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Pagination Dots */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-40 pointer-events-auto">
                  {fragments.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all ${idx === currentFragmentIndex ? 'bg-white w-4' : 'bg-white/30'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Fade Transition Layer */}
      <TransitionOverlay />
    </>
  );
};

// Component to handle fade-to-black/white transition
const TransitionOverlay = () => {
  const viewMode = useAppStore(state => state.viewMode);
  const [active, setActive] = useState(false);
  const prevMode = useRef(viewMode);

  useEffect(() => {
    if (prevMode.current !== viewMode) {
      setActive(true);
      const timer = setTimeout(() => setActive(false), 1000); // Duration of fade
      prevMode.current = viewMode;
      return () => clearTimeout(timer);
    }
  }, [viewMode]);

  return (
    <div 
      className={`absolute inset-0 z-[100] bg-black pointer-events-none transition-opacity duration-1000 ease-in-out ${active ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};

const App: React.FC = () => {
  const viewMode = useAppStore(state => state.viewMode);
  const currentCapsule = useAppStore(state => state.currentCapsule);
  const currentFragmentIndex = useAppStore(state => state.currentFragmentIndex);

  // Determine current image src
  const currentImage = currentCapsule 
    ? currentCapsule.fragments[currentFragmentIndex]?.imageSrc 
    : null;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      <div className="absolute inset-0 z-0">
        <Canvas gl={{ antialias: false, alpha: false }}>
          <color attach="background" args={['#050505']} />
          
          <CameraManager />

          <Suspense fallback={null}>
            {viewMode === 'CORRIDOR' && <MirrorCorridor />}
            
            {viewMode === 'GARDEN' && currentImage && (
              <>
                <ImageParticles imageSrc={currentImage} />
                <OrbitControls 
                  enableZoom={true} 
                  enablePan={false} 
                  enableRotate={true}
                  maxDistance={20}
                  minDistance={2}
                  maxPolarAngle={Math.PI / 1.5}
                  minPolarAngle={Math.PI / 3}
                />
              </>
            )}
          </Suspense>

          <Effects />
        </Canvas>
      </div>

      <UIOverlay />

      <Loader containerStyles={{ background: '#000' }} dataInterpolation={(p) => `Loading Memory... ${p.toFixed(0)}%`} />

      <Leva 
        theme={{
          colors: { accent: '#ffffff', bg: '#1a1a1a', textColor: '#f0f0f0', labelColor: '#888' },
        }}
        collapsed={true} 
      />
    </div>
  );
};

export default App;
