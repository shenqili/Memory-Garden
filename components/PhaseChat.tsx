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
    recognitionRef.current.lang = 'en-US'; // Or 'zh-CN' based on preference

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
      // Build conversation history for context
      // Note: For simplicity in this demo, we might just send the last message + image 
      // or a few recent messages. 
      // Gemini 1.5 Pro/Flash handles context well.
      
      let prompt = text;
      
      // If we have an image, we should include it in the context if it's relevant,
      // but usually for a chat flow, we send the image once at the start or utilize chat history.
      // Here, we'll assume the model has "seen" it if we send it again or just continue text.
      // For best stateless performance, let's send image + history summary.
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `(Context: Previous chat: ${JSON.stringify(chatHistory.slice(-3))}) User said: ${text}` }] }
        ],
        config: {
          systemInstruction: "You are a Soulful Emotional Therapist. You are empathetic, gentle, and poetic. You are looking at a photo the user uploaded (context provided previously). Keep responses concise (under 40 words), warm, and encouraging. Ask deep questions about their memory.",
        },
      });

      const aiText = response.text;
      addChatMessage({ role: 'model', text: aiText || "..." });

    } catch (error) {
      console.error("AI Error", error);
      addChatMessage({ role: 'model', text: "I can feel the emotion, but I'm having trouble finding the words right now." });
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
            model: 'gemini-2.5-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                  { text: "Analyze this image. Act as a Soulful Emotional Therapist. Briefly describe the mood of this photo in 1 sentence and ask me a gentle question about how I felt in that moment." }
                ]
              }
            ],
          });
          
          addChatMessage({ role: 'model', text: response.text || "This image holds a deep memory..." });
        } catch (e) {
          console.error(e);
          addChatMessage({ role: 'model', text: "I see your memory, but it's a bit hazy. Tell me about it?" });
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
              <p className="text-lg font-light leading-relaxed">
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