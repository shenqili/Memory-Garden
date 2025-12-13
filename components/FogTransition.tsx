
import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store';

const transitionVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const transitionFragmentShader = `
  uniform float uTime;
  uniform float uProgress; // 0.0 to 1.0
  uniform float uDirection; // 1.0 (Zoom In/Push), -1.0 (Zoom Out/Gather)
  uniform vec2 uResolution;
  
  varying vec2 vUv;

  // Simplex Noise (2D)
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
            -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod((i), 289.0);
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

  // Fractal Brownian Motion
  float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(st);
      st *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    // 1. Coordinates Logic
    // Center UVs for zoom effect
    vec2 center = vec2(0.5);
    vec2 centeredUv = vUv - center;
    
    // Distort UVs based on progress and direction
    // When uDirection is 1 (Enter): UVs expand (Zoom In)
    // When uDirection is -1 (Exit): UVs shrink (Zoom Out)
    float zoomFactor = 1.0 - (uProgress * 0.8 * uDirection);
    vec2 distortedUv = centeredUv * zoomFactor + center;

    // 2. Noise/Fog Generation
    // Move noise over time and based on zoom
    float noise = fbm(distortedUv * 4.0 + vec2(0.0, uTime * 0.5));
    
    // Add radial gradient (tunnel effect)
    float dist = length(centeredUv);
    float vignette = smoothstep(0.8, 0.2, dist); // Darker at edges? No, fog is whiter at edges usually
    
    // 3. Opacity Logic
    // Threshold shifts based on uProgress
    // uProgress 0 -> 1 : Fog covers screen
    float threshold = uProgress * 1.8; // Go slightly beyond 1.0 to ensure full coverage
    
    // Soft cloud edge
    float fogAlpha = smoothstep(threshold - 0.6, threshold, noise + 0.2);
    
    // Force full white at peak progress to hide scene switch
    float peakCover = smoothstep(0.8, 1.0, uProgress);
    
    float finalAlpha = max(fogAlpha, peakCover);
    
    if (finalAlpha < 0.01) discard;

    vec3 fogColor = vec3(0.9, 0.92, 0.95); // Cold white fog
    
    gl_FragColor = vec4(fogColor, finalAlpha);
  }
`;

const FogTransition: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();
  
  const isTransitioning = useAppStore(state => state.isVisualTransitioning);
  const transitionDirection = useAppStore(state => state.transitionDirection);
  const completeTransition = useAppStore(state => state.completeTransition);

  // Local progress state: 0 (No Fog) -> 1 (Full Fog) -> 0 (No Fog)
  // But since the Store handles the "Hold" phase by switching modes while we are at 1,
  // we need to coordinate:
  // 1. isVisualTransitioning BECOMES TRUE
  // 2. Animate localProgress 0 -> 1
  // 3. Call completeTransition() (Store switches data)
  // 4. Store sets isVisualTransitioning FALSE
  // 5. Animate localProgress 1 -> 0

  const progressRef = useRef(0);
  const hasTriggeredSwitch = useRef(false);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const material = meshRef.current.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = state.clock.getElapsedTime();
    material.uniforms.uResolution.value.set(viewport.width, viewport.height);
    material.uniforms.uDirection.value = transitionDirection === 'IN' ? 1.0 : -1.0;

    const speed = 1.5 * delta;

    if (isTransitioning) {
      // Phase 1: Fog Entering (0 -> 1)
      progressRef.current = Math.min(progressRef.current + speed, 1.0);
      
      // If we hit full fog and haven't switched scenes yet
      if (progressRef.current >= 1.0 && !hasTriggeredSwitch.current) {
        hasTriggeredSwitch.current = true;
        completeTransition(); // Switch scene data
      }
    } else {
      // Phase 2: Fog Exiting (1 -> 0)
      if (progressRef.current > 0) {
        progressRef.current = Math.max(progressRef.current - speed, 0.0);
        // Reset switch flag when we are done
        if (progressRef.current <= 0.0) {
          hasTriggeredSwitch.current = false;
        }
      }
    }

    material.uniforms.uProgress.value = progressRef.current;
    
    // Optimize: Hide mesh if not visible
    if (meshRef.current) {
        meshRef.current.visible = progressRef.current > 0.01;
    }
  });

  return (
    <mesh ref={meshRef} renderOrder={1000} position={[0, 0, 0]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={transitionVertexShader}
        fragmentShader={transitionFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uDirection: { value: 1.0 },
          uResolution: { value: new THREE.Vector2(1, 1) }
        }}
        transparent={true}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
};

export default FogTransition;
