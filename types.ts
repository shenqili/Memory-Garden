import * as THREE from 'three';

export interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  uvs: Float32Array; // 这里存储的是初始的 3D 位置 (xyz)
  realUvs: Float32Array; // ✨ 新增：这里存储真正的纹理坐标 (uv)
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
  images: string[]; // Changed from single imageSrc to array
  date: string;
  text: string;
  chatHistory?: ChatMessage[];
  audioUrl?: string;
}