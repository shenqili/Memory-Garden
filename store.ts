import { create } from 'zustand';
import { AppPhase, Memory, ChatMessage } from './types';

// Mock Data
const MOCK_MEMORIES: Memory[] = [
  {
    id: '1',
    imageSrc: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop',
    date: 'Dec 24, 2023',
    text: "The snow was falling silently tonight. It reminded me of that winter in Hokkaido. I felt a bit lonely but peaceful."
  },
  {
    id: '2',
    imageSrc: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop',
    date: 'Jan 01, 2024',
    text: "New Year's Eve fireworks. The noise was overwhelming, but the colors... they looked like exploding stars."
  },
  {
    id: '3',
    imageSrc: 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?q=80&w=800&auto=format&fit=crop',
    date: 'Feb 14, 2024',
    text: "Thinking about connections today. Like neural networks, or roots of a tree. We are all entangled."
  }
];

interface AppState {
  phase: AppPhase;
  currentMemory: Memory | null;
  memories: Memory[];
  audioLevel: number; // 0.0 to 1.0, updated by PhaseChat
  chatHistory: ChatMessage[];
  isProcessingAI: boolean;
  
  // Actions
  setPhase: (phase: AppPhase) => void;
  setCurrentMemory: (memory: Memory) => void;
  setAudioLevel: (level: number) => void;
  addMemory: (memory: Memory) => void;
  loadMemory: (id: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  setIsProcessingAI: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  phase: 'IDLE',
  currentMemory: null,
  memories: MOCK_MEMORIES,
  audioLevel: 0,
  chatHistory: [],
  isProcessingAI: false,

  setPhase: (phase) => set({ phase }),
  setCurrentMemory: (memory) => set({ currentMemory: memory }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  
  addMemory: (memory) => set((state) => ({ 
    memories: [memory, ...state.memories],
    currentMemory: memory
  })),

  loadMemory: (id) => {
    const mem = get().memories.find(m => m.id === id);
    if (mem) {
      set({ currentMemory: mem, phase: 'GALLERY', chatHistory: mem.chatHistory || [] });
    }
  },

  addChatMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
  clearChat: () => set({ chatHistory: [] }),
  setIsProcessingAI: (loading) => set({ isProcessingAI: loading })
}));