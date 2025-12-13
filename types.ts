
import * as THREE from 'three';
import { ThreeElements } from '@react-three/fiber';

export interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  uvs: Float32Array; // Initial 3D positions
  realUvs: Float32Array; // Texture coordinates
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
export type ViewMode = 'FOREST' | 'GARDEN';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface MemoryFragment {
  id: string;
  imageSrc: string;
  text: string;
}

export interface MemoryCapsule {
  id: string;
  date: string;
  title: string;
  coverImage: string;
  audioUrl?: string;
  fragments: MemoryFragment[];
  chatHistory?: ChatMessage[];
  position?: [number, number, number]; // Position in the 3D forest
}

// Fix for Property '...' does not exist on type 'JSX.IntrinsicElements'
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
