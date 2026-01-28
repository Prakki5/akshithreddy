import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { ChatMessage } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Send, Volume2, Globe, Bot, User, Loader2, Mic, MicOff, Copy, Check, Sparkles, Settings2, SlidersHorizontal, Languages } from 'lucide-react';

// Available prebuilt voices for Gemini TTS
const VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
const RATES = [
{ label: 'Slow', value: 'slow' },
{ label: 'Normal', value: 'normal' },
{ label: 'Fast', value: 'fast' }
];

// Helper to encode PCM bytes to base64
function encode(bytes: Uint8Array) {
let binary = '';
const len = bytes.byteLength;
for (let i = 0; i < len; i++) {
binary += String.fromCharCode(bytes[i]);
}
return btoa(binary);
}

const AiAssistant: React.FC = () => {
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [input, setInput] = useState('');
const [language, setLanguage] = useState('English');
const [loading, setLoading] = useState(false);
const [isSpeaking, setIsSpeaking] = useState(false);
const [isListening, setIsListening] = useState(false);
const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
const [showSettings, setShowSettings] = useState(false);

// TTS Settings
const [selectedVoice, setSelectedVoice] = useState('Kore');
const [selectedRate, setSelectedRate] = useState('normal');

const scrollRef = useRef<HTMLDivElement>(null);

// Voice Input Refs
const audioContextRef = useRef<AudioContext | null>(null);
const liveSessionRef = useRef<any>(null);
const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

useEffect(() => {
if (scrollRef.current) {
scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
}
}, [messages]);

const handleSend = async (e?: React.FormEvent, directText?: string) => {
if (e) e.preventDefault();
const textToSend = directText || input;
if (!textToSend.trim() || loading) return;

const userMsg: ChatMessage = { role: 'user', text: textToSend, timestamp: Date.now() };  
setMessages(prev => [...prev, userMsg]);  
setInput('');  
setLoading(true);  

try {  
  const response = await geminiService.getChatResponse(textToSend);  
  // Update UI with detected language  
  if (response.detectedLanguage) {  
    setLanguage(response.detectedLanguage);  
  }  
  const botMsg: ChatMessage = { role: 'model', text: response.text, timestamp: Date.now() };  
  setMessages(prev => [...prev, botMsg]);  
} catch (err) {  
  console.error(err);  
} finally {  
  setLoading(false);  
}

};

const handleSpeak = async (text: string) => {
setIsSpeaking(true);
try {
await geminiService.speakText(text, selectedVoice, selectedRate);
} finally {
setIsSpeaking(false);
}
};

const handleCopy = (text: string, index: number) => {
navigator.clipboard.writeText(text).then(() => {
setCopiedIndex(index);
setTimeout(() => setCopiedIndex(null), 2000);
});
};

const startVoiceInput = async () => {
if (isListening) {
stopVoiceInput();
return;
}

try {  
  setIsListening(true);  
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });  
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });  
  audioContextRef.current = audioCtx;  

 const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
 

  let transcribedText = '';  

  const sessionPromise = ai.live.connect({  
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',  
    callbacks: {  
      onopen: () => {  
        const source = audioCtx.createMediaStreamSource(stream);  
        const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);  
        scriptProcessorRef.current = scriptProcessor;  

        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {  
          const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);  
          const l = inputData.length;  
          const int16 = new Int16Array(l);  
          for (let i = 0; i < l; i++) {  
            int16[i] = inputData[i] * 32768;  
          }  
          const pcmBlob = {  
            data: encode(new Uint8Array(int16.buffer)),  
            mimeType: 'audio/pcm;rate=16000',  
          };  

          sessionPromise.then((session) => {  
            session.sendRealtimeInput({ media: pcmBlob });  
          });  
        };  
        source.connect(scriptProcessor);  
        scriptProcessor.connect(audioCtx.destination);  
      },  
      onmessage: async (message: LiveServerMessage) => {  
        if (message.serverContent?.inputTranscription) {  
          const text = message.serverContent.inputTranscription.text;  
          transcribedText += text;  
          setInput(prev => prev + text);  
        }  
        if (message.serverContent?.turnComplete) {  
          if (transcribedText.trim()) {  
            handleSend(undefined, transcribedText);  
          }  
          stopVoiceInput();  
        }  
      },  
      onerror: (e) => {  
        console.error('Voice input error:', e);  
        stopVoiceInput();  
      },  
      onclose: () => {  
        stopVoiceInput();  
      },  
    },  
    config: {  
      responseModalities: [Modality.AUDIO],  
      inputAudioTranscription: {},  
      systemInstruction: 'Transcribe user cybersecurity requests. Auto-detect the language from the voice.'  
    },  
  });  

  liveSessionRef.current = sessionPromise;  
} catch (err) {  
  console.error('Microphone access failed:', err);  
  setIsListening(false);  
}

};

const stopVoiceInput = () => {
setIsListening(false);
if (scriptProcessorRef.current) {
scriptProcessorRef.current.disconnect();
scriptProcessorRef.current = null;
}
if (audioContextRef.current) {
audioContextRef.current.close();
audioContextRef.current = null;
}
liveSessionRef.current = null;
};

return (
<div className="flex flex-col h-[calc(100vh-12rem)] max-w-4xl mx-auto border border-gray-800 bg-gray-950/40 backdrop-blur-xl rounded-3xl overflow-hidden animate-fadeIn relative">
{/* Voice Mode Indicator Overlay */}
{isListening && (
<div className="absolute inset-0 z-50 bg-indigo-950/40 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
<div className="relative mb-8">
<div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20" />
<div className="relative w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-600/50">
<Mic className="text-white w-10 h-10 animate-pulse" />
</div>
</div>
<h3 className="text-2xl font-bold text-white mb-2">Nexus Voice Mode</h3>
<p className="text-indigo-200 opacity-80 max-w-xs mb-8">మీ వాయిస్ వింటున్నాను... Speak naturally in any language.</p>
<button   
onClick={stopVoiceInput}  
className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-all active:scale-95 flex items-center gap-2"  
>
<MicOff size={20} /> Stop Listening
</button>
</div>
)}

{/* Chat Header */}  
  <div className="bg-gray-800/20 p-4 border-b border-white/5 flex items-center justify-between backdrop-blur-md">  
    <div className="flex items-center gap-3">  
      <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/30">  
        <Bot className="text-white" size={24} />  
      </div>  
      <div>  
        <h3 className="text-white font-bold text-sm tracking-wide">Cyber Assistant</h3>  
        <div className="flex items-center gap-1.5">  
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>  
          <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Multilingual Core Active</p>  
        </div>  
      </div>  
    </div>  
    <div className="flex items-center gap-3">  
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">  
        <Languages size={14} className="text-indigo-400" />  
        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-tight">  
          Detected: <span className="text-white">{language}</span>  
        </span>  
      </div>  
      <button   
        onClick={() => setShowSettings(!showSettings)}  
        className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'}`}  
        title="Speech Settings"  
      >  
        <Settings2 size={20} />  
      </button>  
    </div>  
  </div>  

  {/* Settings Overlay */}  
  {showSettings && (  
    <div className="absolute top-20 right-4 z-40 w-64 bg-gray-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-4 space-y-4 animate-slideDown">  
      <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">  
        <SlidersHorizontal size={16} className="text-indigo-400" />  
        <span className="text-sm font-bold text-white uppercase tracking-wider">Speech Config</span>  
      </div>  

      <div className="space-y-2">  
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Select Voice</label>  
        <div className="grid grid-cols-2 gap-2">  
          {VOICES.map(voice => (  
            <button  
              key={voice}  
              onClick={() => setSelectedVoice(voice)}  
              className={`px-3 py-1.5 text-xs rounded-lg transition-all border ${selectedVoice === voice ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-gray-400'}`}  
            >  
              {voice}  
            </button>  
          ))}  
        </div>  
      </div>  

      <div className="space-y-2">  
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Speaking Rate</label>  
        <div className="flex gap-2">  
          {RATES.map(rate => (  
            <button  
              key={rate.value}  
              onClick={() => setSelectedRate(rate.value)}  
              className={`flex-1 py-1.5 text-xs rounded-lg transition-all border ${selectedRate === rate.value ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-gray-400'}`}  
            >  
              {rate.label}  
            </button>  
          ))}  
        </div>  
      </div>  
    </div>  
  )}  

  {/* Chat Messages */}  
  <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>  
    {messages.length === 0 && (  
      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">  
        <div className="p-5 bg-indigo-600/10 rounded-full border border-indigo-600/20">  
          <Sparkles size={48} className="text-indigo-400" />  
        </div>  
        <div>  
          <p className="text-white font-bold text-lg">Nexus Intelligence System</p>  
          <p className="text-gray-400 max-w-xs text-sm mt-2">  
            Fluency in English, తెలుగు, हिंदी & 100+ languages.   
            <span className="block italic text-xs mt-1">"నమస్కారం! నేను మీకు ఎలా సహాయపడగలను?"</span>  
          </p>  
        </div>  
      </div>  
    )}  
    {messages.map((msg, idx) => (  
      <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>  
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-600 shadow-md' : 'bg-white/5 border border-white/10'}`}>  
          {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}  
        </div>  
        <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end' : ''}`}>  
          <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg' : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none shadow-sm backdrop-blur-sm'}`}>  
            <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>  
          </div>  
          {msg.role === 'model' && (  
            <div className="flex items-center gap-4 px-2">  
              <button   
                onClick={() => handleSpeak(msg.text)}  
                disabled={isSpeaking}  
                className="flex items-center gap-2 text-[10px] uppercase font-bold text-gray-500 hover:text-indigo-400 transition-colors tracking-widest disabled:opacity-50"  
              >  
                <Volume2 size={12} />  
                {isSpeaking ? 'Speaking...' : 'Listen'}  
              </button>  
              <button   
                onClick={() => handleCopy(msg.text, idx)}  
                className="flex items-center gap-2 text-[10px] uppercase font-bold text-gray-500 hover:text-indigo-400 transition-colors tracking-widest"  
              >  
                {copiedIndex === idx ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}  
                {copiedIndex === idx ? 'Copied' : 'Copy'}  
              </button>  
            </div>  
          )}  
        </div>  
      </div>  
    ))}  
    {loading && (  
      <div className="flex gap-4">  
        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">  
          <Bot size={16} />  
        </div>  
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 rounded-tl-none flex items-center gap-3 backdrop-blur-sm">  
          <div className="flex gap-1">  
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />  
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />  
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />  
          </div>  
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Analyzing Thought Stream</span>  
        </div>  
      </div>  
    )}  
  </div>  

  {/* Chat Input */}  
  <form onSubmit={handleSend} className="p-4 bg-gray-950/20 backdrop-blur-md border-t border-white/5 flex gap-4">  
    <button  
      type="button"  
      onClick={startVoiceInput}  
      className={`p-3 rounded-2xl transition-all border ${isListening ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/10 text-gray-400 hover:text-indigo-400 hover:bg-white/10'}`}  
      title="Voice Command"  
    >  
      <Mic size={20} className={isListening ? 'animate-pulse' : ''} />  
    </button>  
    <input  
      type="text"  
      value={input}  
      onChange={(e) => setInput(e.target.value)}  
      placeholder="Ask Nexus anything... (తెలుగు/Hindi supported)"  
      className="flex-1 bg-black/40 border border-white/10 text-white rounded-2xl px-5 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner font-medium text-sm placeholder:text-gray-600"  
    />  
    <button  
      type="submit"  
      disabled={loading || !input.trim()}  
      className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-gray-600 text-white p-3 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 group"  
    >  
      <Send size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />  
    </button>  
  </form>  
</div>

);
};

export default AiAssistant;
