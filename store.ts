import { create } from 'zustand';
import { AppPhase, Memory, ChatMessage } from './types';

// Mock Data with 3D positions for the Coastline Gallery
const MOCK_MEMORIES: Memory[] = [
  {
    id: '1',
    imageSrc: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop',
    date: 'Dec 24, 2023',
    text: "The snow was falling silently tonight. It reminded me of that winter in Hokkaido.",
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1]
  },
  {
    id: '2',
    imageSrc: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop',
    date: 'Jan 01, 2024',
    text: "New Year's Eve fireworks. The noise was overwhelming, but the colors...",
    position: [12, 0, -2],
    rotation: [0, -0.2, 0],
    scale: [1, 1, 1]
  },
  {
    id: '3',
    imageSrc: 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?q=80&w=800&auto=format&fit=crop',
    date: 'Feb 14, 2024',
    text: "Thinking about connections today. Like neural networks.",
    position: [24, 2, -5],
    rotation: [0, -0.4, 0],
    scale: [1, 1, 1]
  },
  {
    id: '4',
    imageSrc: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&auto=format&fit=crop',
    date: 'Mar 10, 2024',
    text: "Walking through the mist in the morning.",
    position: [36, -1, -3],
    rotation: [0, -0.1, 0],
    scale: [1, 1, 1]
  }
];

interface AppState {
  phase: AppPhase;
  currentMemory: Memory | null;
  memories: Memory[];
  audioLevel: number;
  chatHistory: ChatMessage[];
  isProcessingAI: boolean;
  isGalleryMode: boolean;
  
  // Actions
  setPhase: (phase: AppPhase) => void;
  setCurrentMemory: (memory: Memory) => void;
  setAudioLevel: (level: number) => void;
  addMemory: (memory: Memory) => void;
  loadMemory: (id: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  setIsProcessingAI: (loading: boolean) => void;
  setIsGalleryMode: (mode: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  phase: 'GALLERY', // Start in Gallery
  currentMemory: null,
  memories: MOCK_MEMORIES,
  audioLevel: 0,
  chatHistory: [],
  isProcessingAI: false,
  isGalleryMode: true,

  setPhase: (phase) => {
    set({ phase });
    if (phase === 'GALLERY') {
      set({ isGalleryMode: true, currentMemory: null });
    } else if (phase === 'CHATTING') {
      set({ isGalleryMode: false });
    }
  },
  setCurrentMemory: (memory) => set({ currentMemory: memory }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  
  addMemory: (memory) => set((state) => ({ 
    memories: [memory, ...state.memories],
    currentMemory: memory
  })),

  loadMemory: (id) => {
    const mem = get().memories.find(m => m.id === id);
    if (mem) {
      set({ currentMemory: mem, phase: 'CHATTING', isGalleryMode: false, chatHistory: mem.chatHistory || [] });
    }
  },

  addChatMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
  clearChat: () => set({ chatHistory: [] }),
  setIsProcessingAI: (loading) => set({ isProcessingAI: loading }),
  setIsGalleryMode: (mode) => set({ isGalleryMode: mode })
}));