import React from 'react';
import { useAppStore } from '../store';
import { motion } from 'framer-motion';

const PhaseGallery: React.FC = () => {
  const memories = useAppStore(state => state.memories);
  const currentMemory = useAppStore(state => state.currentMemory);
  const setCurrentMemory = useAppStore(state => state.setCurrentMemory);
  const setPhase = useAppStore(state => state.setPhase);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute bottom-0 left-0 w-full p-6 z-40 bg-gradient-to-t from-black via-black/80 to-transparent"
    >
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl font-light text-white">{currentMemory?.date}</h2>
          <p className="text-sm text-gray-400 max-w-md mt-1 line-clamp-2">{currentMemory?.text}</p>
        </div>
        <button 
           onClick={() => setPhase('CHATTING')}
           className="px-4 py-2 bg-white/10 border border-white/20 rounded-full text-xs hover:bg-white/20 transition"
        >
          + New Entry
        </button>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
        {memories.map(mem => (
          <button 
            key={mem.id}
            onClick={() => setCurrentMemory(mem)}
            className={`relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${currentMemory?.id === mem.id ? 'border-white scale-105' : 'border-transparent opacity-50 hover:opacity-80'}`}
          >
            <img src={mem.imageSrc} alt={mem.date} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default PhaseGallery;
