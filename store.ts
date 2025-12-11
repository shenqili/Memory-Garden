
import { create } from 'zustand';
import { AppPhase, ViewMode, MemoryCapsule, ChatMessage } from './types';

// Mock Data
const MOCK_CAPSULES: MemoryCapsule[] = [
  {
    id: '1',
    date: 'Dec 24, 2023',
    title: 'Winter Solstice',
    coverImage: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=80&w=800&auto=format&fit=crop',
    fragments: [
      {
        id: 'f1-1',
        imageSrc: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=80&w=800&auto=format&fit=crop',
        text: "The snow was falling silently tonight."
      },
      {
        id: 'f1-2',
        imageSrc: 'https://images.unsplash.com/photo-1548266652-99cf277df8c3?q=80&w=800&auto=format&fit=crop',
        text: "Walking alone through the frozen streets."
      }
    ]
  },
  {
    id: '2',
    date: 'Jan 01, 2024',
    title: 'Neon New Year',
    coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop',
    fragments: [
      {
        id: 'f2-1',
        imageSrc: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop',
        text: "Fireworks exploding like dying stars."
      }
    ]
  },
  {
    id: '3',
    date: 'Feb 14, 2024',
    title: 'Entangled Roots',
    coverImage: 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?q=80&w=800&auto=format&fit=crop',
    fragments: [
      {
        id: 'f3-1',
        imageSrc: 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?q=80&w=800&auto=format&fit=crop',
        text: "Thinking about connections today."
      }
    ]
  },
  {
    id: '4',
    date: 'Mar 20, 2024',
    title: 'Spring Awakening',
    coverImage: 'https://images.unsplash.com/photo-1522748906645-95d8adfd52c7?q=80&w=800&auto=format&fit=crop',
    fragments: [
       {
        id: 'f4-1',
        imageSrc: 'https://images.unsplash.com/photo-1522748906645-95d8adfd52c7?q=80&w=800&auto=format&fit=crop',
        text: "First bloom of the season."
       }
    ]
  },
  {
    id: '5',
    date: 'Apr 05, 2024',
    title: 'Rainy Cafe',
    coverImage: 'https://images.unsplash.com/photo-1493857671505-72967e2e2760?q=80&w=800&auto=format&fit=crop',
    fragments: [
       {
        id: 'f5-1',
        imageSrc: 'https://images.unsplash.com/photo-1493857671505-72967e2e2760?q=80&w=800&auto=format&fit=crop',
        text: "Coffee and rain."
       }
    ]
  }
];

interface AppState {
  viewMode: ViewMode;
  phase: AppPhase;
  currentCapsule: MemoryCapsule | null;
  currentFragmentIndex: number;
  capsules: MemoryCapsule[];
  audioLevel: number;
  chatHistory: ChatMessage[];
  isProcessingAI: boolean;
  
  // Actions
  setViewMode: (mode: ViewMode) => void;
  setPhase: (phase: AppPhase) => void;
  enterMemory: (id: string) => void;
  exitMemory: () => void;
  nextFragment: () => void;
  prevFragment: () => void;
  setAudioLevel: (level: number) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  setIsProcessingAI: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  viewMode: 'CORRIDOR',
  phase: 'IDLE',
  currentCapsule: null,
  currentFragmentIndex: 0,
  capsules: MOCK_CAPSULES,
  audioLevel: 0,
  chatHistory: [],
  isProcessingAI: false,

  setViewMode: (viewMode) => set({ viewMode }),
  setPhase: (phase) => set({ phase }),
  
  enterMemory: (id) => {
    const capsule = get().capsules.find(c => c.id === id);
    if (capsule) {
      set({ 
        currentCapsule: capsule, 
        currentFragmentIndex: 0,
        viewMode: 'GARDEN',
        phase: 'CHATTING', 
        chatHistory: capsule.chatHistory || []
      });
    }
  },

  exitMemory: () => {
    set({
      viewMode: 'CORRIDOR',
      currentCapsule: null,
      phase: 'IDLE'
    });
  },

  nextFragment: () => {
    const { currentCapsule, currentFragmentIndex } = get();
    if (currentCapsule) {
      const nextIndex = (currentFragmentIndex + 1) % currentCapsule.fragments.length;
      set({ currentFragmentIndex: nextIndex });
    }
  },

  prevFragment: () => {
    const { currentCapsule, currentFragmentIndex } = get();
    if (currentCapsule) {
      const len = currentCapsule.fragments.length;
      const prevIndex = (currentFragmentIndex - 1 + len) % len;
      set({ currentFragmentIndex: prevIndex });
    }
  },

  setAudioLevel: (level) => set({ audioLevel: level }),
  addChatMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
  clearChat: () => set({ chatHistory: [] }),
  setIsProcessingAI: (loading) => set({ isProcessingAI: loading })
}));
