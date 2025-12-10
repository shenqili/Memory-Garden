import * as THREE from 'three';

export interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  uvs: Float32Array;
  realUvs: Float32Array;
  count: number;
  id?: string;
}

export interface Uniforms {
  uTime: { value: number };
  uMouse: { value: THREE.Vector3 };
  uResolution: { value: THREE.Vector2 };
  
  // Visual Parameters
  uSize: { value: number };
  uContrast: { value: number };
  uColorShiftSpeed: { value: number };
  
  // Physics/Flow Parameters
  uFlowSpeed: { value: number };
  uFlowAmplitude: { value: number };
  uDispersion: { value: number };
  
  // Depth/Structure Parameters
  uDepthStrength: { value: number };
  uDepthWave: { value: number };
  
  // Interaction/Animation Parameters
  uHoverRadius: { value: number };
  uMouseStrength: { value: number };
  
  // Audio Reactive
  uAudioHigh: { value: number }; 
}

export type AppPhase = 'IDLE' | 'CHATTING' | 'GENERATING' | 'GALLERY';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Memory {
  id: string;
  imageSrc: string;
  date: string;
  text: string;
  chatHistory?: ChatMessage[];
  audioUrl?: string;
  // 3D Scene Properties
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}