import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useControls, folder } from 'leva';
import { particleVertexShader, particleFragmentShader } from '../utils/shaderUtils';
import { ParticleData } from '../types';
import { useAppStore } from '../store';

// Extend props to allow 3D positioning
interface ImageParticlesProps extends React.ComponentProps<'points'> {
  imageSrc: string;
  isInteractive?: boolean;
}

const ImageParticles: React.FC<ImageParticlesProps> = ({ imageSrc, isInteractive = true, ...props }) => {
  const meshRef = useRef<THREE.Points>(null);
  const { camera } = useThree();
  const [particleData, setParticleData] = useState<ParticleData | null>(null);
  
  const loadedImageRef = useRef<string | null>(null);
  const dispersionTarget = useRef(0.1);
  const currentDispersion = useRef(0.1);
  const isTransitioning = useRef(false);
  const nextParticleData = useRef<ParticleData | null>(null);

  const audioLevel = useAppStore(state => state.audioLevel);
  const audioLevelRef = useRef(0);
  useEffect(() => { audioLevelRef.current = audioLevel; }, [audioLevel]);

  // Use controls but allow override if needed? For now global.
  const controls = useControls('Gemini Particle Interface', {
    'Visual parameters': folder({
      particleSize: { value: 2.0, min: 0.1, max: 10.0 },
      contrast: { value: 1.1, min: 0.5, max: 3.0 },
      colorShiftSpeed: { value: 0.0, min: 0.0, max: 2.0 },
    }),
    'Flow & Movement': folder({
      flowSpeed: { value: 0.2, min: 0.0, max: 2.0 },
      flowAmplitude: { value: 0.5, min: 0.0, max: 5.0 },
      depthStrength: { value: 2.0, min: 0.0, max: 20.0 },
      depthWave: { value: 0.0, min: 0.0, max: 10.0 },
    }),
    'Interaction': folder({
      mouseRadius: { value: 3.0, min: 0.1, max: 10.0 },
      mouseStrength: { value: 4.0, min: 0.1, max: 10.0 },
    })
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector3(9999, 9999, 0) },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uSize: { value: controls.particleSize },
      uContrast: { value: controls.contrast },
      uColorShiftSpeed: { value: controls.colorShiftSpeed },
      uDispersion: { value: 0.1 },
      uFlowSpeed: { value: controls.flowSpeed },
      uFlowAmplitude: { value: controls.flowAmplitude },
      uDepthStrength: { value: controls.depthStrength },
      uDepthWave: { value: controls.depthWave },
      uHoverRadius: { value: controls.mouseRadius },
      uMouseStrength: { value: controls.mouseStrength },
      uAudioHigh: { value: 0.0 },
    }),
    []
  );

  useEffect(() => {
    if (meshRef.current) {
      const u = meshRef.current.material as THREE.ShaderMaterial;
      u.uniforms.uSize.value = controls.particleSize;
      u.uniforms.uContrast.value = controls.contrast;
      u.uniforms.uColorShiftSpeed.value = controls.colorShiftSpeed;
      u.uniforms.uFlowSpeed.value = controls.flowSpeed;
      u.uniforms.uFlowAmplitude.value = controls.flowAmplitude;
      u.uniforms.uDepthStrength.value = controls.depthStrength;
      u.uniforms.uDepthWave.value = controls.depthWave;
      u.uniforms.uHoverRadius.value = controls.mouseRadius;
      u.uniforms.uMouseStrength.value = controls.mouseStrength;
    }
  }, [controls]);

  const processImage = (src: string) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = src;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 350; 
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxSize) { height = Math.floor(height * (maxSize / width)); width = maxSize; }
      } else {
        if (height > maxSize) { width = Math.floor(width * (maxSize / height)); height = maxSize; }
      }

      canvas.width = Math.floor(width);
      canvas.height = Math.floor(height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      const positions: number[] = [];
      const colors: number[] = [];
      const initials: number[] = [];
      const realUvs: number[] = [];
      
      const aspect = width / height;
      const sceneWidth = 16;
      const sceneHeight = sceneWidth / aspect;
      const offsetX = -sceneWidth / 2;
      const offsetY = sceneHeight / 2;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;
          const a = data[i + 3] / 255;

          if (a > 0.2 && (r + g + b) > 0.1) {
            const posX = (x / canvas.width) * sceneWidth + offsetX;
            const posY = -((y / canvas.height) * sceneHeight) + offsetY;
            
            positions.push(posX, posY, 0);
            initials.push(posX, posY, 0);
            colors.push(r, g, b);
            realUvs.push(x / canvas.width, 1.0 - y / canvas.height); 
          }
        }
      }

      const newData: ParticleData = {
        positions: new Float32Array(positions),
        colors: new Float32Array(colors),
        uvs: new Float32Array(initials), 
        realUvs: new Float32Array(realUvs),
        count: positions.length / 3,
        id: Math.random().toString(36).substr(2, 9)
      };

      if (!particleData) {
        setParticleData(newData);
        loadedImageRef.current = src;
      } else {
        nextParticleData.current = newData;
      }
    };
  };

  useEffect(() => {
    if (loadedImageRef.current !== imageSrc) {
      if (!particleData) {
        processImage(imageSrc);
      } else {
        isTransitioning.current = true;
        dispersionTarget.current = 4.0;
        loadedImageRef.current = imageSrc;
        processImage(imageSrc);
      }
    }
  }, [imageSrc]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
      material.uniforms.uAudioHigh.value = THREE.MathUtils.lerp(
        material.uniforms.uAudioHigh.value, 
        audioLevelRef.current, 
        0.1
      );

      currentDispersion.current = THREE.MathUtils.lerp(currentDispersion.current, dispersionTarget.current, delta * 3.0);
      material.uniforms.uDispersion.value = currentDispersion.current;

      if (isTransitioning.current && currentDispersion.current > 3.0 && nextParticleData.current) {
        setParticleData(nextParticleData.current);
        nextParticleData.current = null;
        isTransitioning.current = false;
        dispersionTarget.current = 0.1; 
      }

      if (isInteractive) {
        // Raycasting for mouse interaction only if interactive
        const vec = new THREE.Vector3(state.pointer.x, state.pointer.y, 0.5);
        vec.unproject(camera);
        const dir = vec.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z;
        const pos = camera.position.clone().add(dir.multiplyScalar(distance));
        // Transform mouse position to local space if mesh is transformed
        meshRef.current.worldToLocal(pos);
        material.uniforms.uMouse.value.copy(pos);
      } else {
         material.uniforms.uMouse.value.set(9999,9999,9999);
      }
    }
  });

  if (!particleData) return null;

  return (
    <points ref={meshRef} key={particleData.id} {...props}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleData.count}
          array={particleData.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-initialPosition"
          count={particleData.count}
          array={particleData.uvs}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleData.count}
          array={particleData.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-uv"
          count={particleData.count}
          array={particleData.realUvs}
          itemSize={2}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default ImageParticles;