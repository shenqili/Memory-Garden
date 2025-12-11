import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";

// Augment window for SpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// Helper to convert blob URL to base64
const blobUrlToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const PhaseChat: React.FC = () => {
  const setAudioLevel = useAppStore(state => state.setAudioLevel);
  const setPhase = useAppStore(state => state.setPhase);
  const currentMemory = useAppStore(state => state.currentMemory);
  const chatHistory = useAppStore(state => state.chatHistory);
  const addChatMessage = useAppStore(state => state.addChatMessage);
  const isProcessingAI = useAppStore(state => state.isProcessingAI);
  const setIsProcessingAI = useAppStore(state => state.setIsProcessingAI);
  
  const [isRecording, setIsRecording] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number>();
  const recognitionRef = useRef<any>(null);
  const hasInitializedChat = useRef(false);

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Audio Visualization Logic (Particles)
  const startAudioViz = async () => {
    try {
      if (!audioContextRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);
      }
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      analyzeLoop();
    } catch (err) {
      console.error("Audio viz error", err);
    }
  };

  const analyzeLoop = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    let sum = 0;
    const startBin = Math.floor(dataArray.length * 0.1);
    const endBin = Math.floor(dataArray.length * 0.6);
    for (let i = startBin; i < endBin; i++) { sum += dataArray[i]; }
    
    const average = sum / (endBin - startBin);
    const normalized = Math.min(average / 100, 1.0);
    setAudioLevel(normalized);
    rafRef.current = requestAnimationFrame(analyzeLoop);
  };

  // 2. Speech Recognition Logic
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser. Try Chrome.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    // ✨ 关键修改：设置为中文
    recognitionRef.current.lang = 'zh-CN'; 

    recognitionRef.current.onstart = () => {
      setIsRecording(true);
      startAudioViz(); // Also start visuals
    };

    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const finalText = event.results[i][0].transcript;
          setUserTranscript(""); // Clear display
          handleUserMessage(finalText);
        } else {
          interimTranscript += event.results[i][0].transcript;
          setUserTranscript(interimTranscript);
        }
      }
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
      setAudioLevel(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // 3. AI Logic
  const handleUserMessage = async (text: string) => {
    if (!text.trim()) return;

    addChatMessage({ role: 'user', text });
    setIsProcessingAI(true);

    try {
      let prompt = text;
      
      const response = await ai.models.generateContent({
        // ✨ 关键修改：使用稳定版模型
        model: 'gemini-2.5-flash', 
        contents: [
          { role: 'user', parts: [{ text: `(Context: Previous chat: ${JSON.stringify(chatHistory.slice(-3))}) User said: ${text}` }] }
        ],
        config: {
          // ✨ 关键修改：中文人设 Prompt
          systemInstruction: `
            你是一位深情、敏锐且富有同理心的情感记录者（类似电影《Her》中的萨曼莎，但更具诗意）。
            你的任务是：
            1. 聆听用户的记忆碎片，用简短、温柔、像散文诗一样的中文回应。
            2. 不要说教，不要像机器人。语气要像深夜里的老朋友。
            3. 回复保持简短（40字以内），引导用户继续回忆细节。
            4. 始终使用中文回复。
          `,
        },
      });

      const aiText = response.text;
      addChatMessage({ role: 'model', text: aiText || "..." });

    } catch (error) {
      console.error("AI Error", error);
      addChatMessage({ role: 'model', text: "此刻有些词穷，但我能感受到你的心情..." });
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Initial Image Analysis (The "Soulful" Start)
  useEffect(() => {
    const initChat = async () => {
      if (currentMemory?.imageSrc && !hasInitializedChat.current && chatHistory.length === 0) {
        hasInitializedChat.current = true;
        setIsProcessingAI(true);
        
        try {
          const base64Image = await blobUrlToBase64(currentMemory.imageSrc);
          
          const response = await ai.models.generateContent({
            // ✨ 关键修改：使用稳定版模型
            model: 'gemini-2.5-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                  // ✨ 关键修改：中文开场白 Prompt
                  { text: "请仔细凝视这张照片。作为一位情感疗愈师，请用一句唯美、感性的中文（不超过30字）描述你感受到的氛围，并温柔地询问我当时的心情。" }
                ]
              }
            ],
          });
          
          addChatMessage({ role: 'model', text: response.text || "这张照片里藏着一段深邃的记忆..." });
        } catch (e) {
          console.error(e);
          addChatMessage({ role: 'model', text: "记忆有些模糊，能跟我讲讲这张照片吗？" });
        } finally {
          setIsProcessingAI(false);
        }
      }
    };

    initChat();
  }, [currentMemory]);

  const handleFinish = () => {
      // Summarize the diary entry based on chat
      setPhase('GENERATING');
      setTimeout(() => setPhase('GALLERY'), 2000); 
  };

  // Get the last message to display as subtitle
  const lastMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col justify-end items-center z-50 pointer-events-none pb-12"
    >
      {/* Subtitles / Chat Interface */}
      <div className="flex flex-col gap-4 mb-8 w-full max-w-2xl px-6 items-center">
        <AnimatePresence mode='popLayout'>
          {lastMessage && (
            <motion.div 
              key={lastMessage.text}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className={`px-6 py-4 rounded-2xl backdrop-blur-xl border max-w-lg text-center shadow-2xl ${
                lastMessage.role === 'model' 
                  ? 'bg-black/40 border-white/10 text-white/90' 
                  : 'bg-white/10 border-white/20 text-white italic'
              }`}
            >
              <p className="text-lg font-light leading-relaxed font-serif">
                 {lastMessage.role === 'model' && <span className="text-purple-300 text-xs uppercase tracking-widest block mb-1">Gemini</span>}
                 {lastMessage.text}
              </p>
            </motion.div>
          )}
          
          {/* Live User Transcript */}
          {isRecording && userTranscript && (
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white/5 px-4 py-2 rounded-lg border border-white/10"
             >
                 <p className="text-gray-300 text-sm">{userTranscript}...</p>
             </motion.div>
          )}

          {isProcessingAI && (
             <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex gap-1">
                 <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" />
                 <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-75" />
                 <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce delay-150" />
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="pointer-events-auto flex items-center gap-6">
        <button 
          onClick={isRecording ? stopListening : startListening}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg border backdrop-blur-sm ${
            isRecording 
              ? 'bg-red-500/20 border-red-400 hover:bg-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
              : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40'
          }`}
        >
           {isRecording ? (
             <div className="w-6 h-6 bg-red-400 rounded-sm animate-pulse" />
           ) : (
             // Mic Icon
             <svg className="w-8 h-8 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
             </svg>
           )}
        </button>
        
        {chatHistory.length > 2 && (
             <button 
                onClick={handleFinish}
                className="absolute right-8 bottom-20 px-6 py-2 rounded-full bg-white/10 border border-white/20 text-xs uppercase tracking-widest hover:bg-white/20 transition-all text-white/60 hover:text-white"
             >
                End & Save
             </button>
        )}
      </div>
      
      <p className="mt-6 text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium">
        {isRecording ? "Listening to your voice..." : "Tap to Speak"}
      </p>
    </motion.div>
  );
};

export default PhaseChat;