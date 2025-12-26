
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Layout } from './components/Layout';
import { Documentation } from './components/Documentation';
import { AnomalyEvent, AnomalySeverity } from './types';
import { MODEL_NAME, SYSTEM_INSTRUCTION, FRAME_RATE, JPEG_QUALITY } from './constants';
import { decode, decodeAudioData, encode } from './services/audioUtils';
import { NeuralProcessor } from './services/NeuralProcessor';
import { 
  AreaChart, Area, CartesianGrid, ResponsiveContainer, XAxis, YAxis
} from 'recharts';
import { 
  ShieldAlert, Target, Upload, 
  Cpu, Radio, BrainCircuit,
  FileText, Zap, Power, Settings, Filter
} from 'lucide-react';

const CATEGORIES = ['Manipulated Sign', 'Image Noise', 'Logic Error', 'General'] as const;

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [logs, setLogs] = useState<AnomalyEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Scoring
  const [threatScore, setThreatScore] = useState<number>(0);
  const [noiseScore, setNoiseScore] = useState<number>(0);
  const [signalStrength, setSignalStrength] = useState<number>(100);
  const [noiseVariance, setNoiseVariance] = useState<number>(0);
  const [history, setHistory] = useState<{time: string, value: number}[]>([]);
  const [analysisText, setAnalysisText] = useState<string>('');

  // UI Configuration
  const [threatThreshold, setThreatThreshold] = useState<number>(40);
  const [noiseThreshold, setNoiseThreshold] = useState<number>(40);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.4);
  const [activeFilters, setActiveFilters] = useState<string[]>(['Manipulated Sign', 'Image Noise', 'Logic Error', 'General']);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const neuralEngine = useRef(new NeuralProcessor());

  const currentRisk = Math.round((threatScore * 0.45) + (noiseScore * 0.55));

  const filteredLogs = useMemo(() => {
    return logs.filter(log => activeFilters.includes(log.category || 'General'));
  }, [logs, activeFilters]);

  const toggleFilter = (category: string) => {
    setActiveFilters(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  const addLog = useCallback((desc: string, severity: AnomalySeverity, category?: any) => {
    const newLog: AnomalyEvent = {
      id: Math.random().toString(36),
      timestamp: Date.now(),
      type: 'Security Scan',
      category: category || 'General',
      description: desc,
      severity
    };
    setLogs(prev => [newLog, ...prev].slice(0, 15));
  }, []);

  const parseTelemetry = useCallback((text: string) => {
    const regex = /\[AXON_UPDATE\]\s+THREAT:\s*(\d+),\s+STRENGTH:\s*(\d+),\s+NOISE:\s*([\d.]+)/i;
    const match = text.match(regex);
    if (match) {
      const threat = parseInt(match[1]);
      const strength = parseInt(match[2]);
      setThreatScore(threat);
      setSignalStrength(strength);
      setNoiseVariance(parseFloat(match[3]));

      // Automatic threshold detection
      if (threat >= threatThreshold) {
        addLog(`Automatic Detection: High risk movement or object identified (${threat}%)`, AnomalySeverity.CRITICAL, 'Logic Error');
      }
    }

    if (text.includes('[ALERT:')) {
      const alertRegex = /\[ALERT:\s*(.*?)\]\s*(.*)/i;
      const alertMatch = text.match(alertRegex);
      if (alertMatch) {
        const category = alertMatch[1].trim() as any;
        const description = alertMatch[2].trim();
        addLog(description, AnomalySeverity.CRITICAL, category);
      }
    } else if (text.includes('[LOG]')) {
      const parts = text.split('[LOG]');
      addLog(parts[parts.length - 1].split('\n')[0].trim(), AnomalySeverity.LOW);
    }
  }, [threatThreshold, addLog]);

  useEffect(() => {
    if (!isConnected) return;
    setHistory(prev => {
      const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return [...prev, { time, value: currentRisk }].slice(-30);
    });
  }, [currentRisk, isConnected]);

  useEffect(() => {
    if (noiseScore >= noiseThreshold && isConnected) {
       addLog(`Spectral Anomaly: Image noise exceeded safety threshold (${noiseScore}%)`, AnomalySeverity.CRITICAL, 'Image Noise');
    }
  }, [noiseScore, noiseThreshold, isConnected, addLog]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = URL.createObjectURL(file);
      videoRef.current.loop = true;
      videoRef.current.muted = false;
      videoRef.current.play();
      startSecurityEngine();
    }
  };

  const startSecurityEngine = async () => {
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      if (videoRef.current) videoRef.current.play();

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const outCtx = new AudioContext({ sampleRate: 24000 });
      audioCtxRef.current = outCtx;

      let audioCursor = 0;
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            streamRef.current = window.setInterval(async () => {
              if (canvasRef.current && videoRef.current && heatmapRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                const htx = heatmapRef.current.getContext('2d');
                if (ctx && htx) {
                  canvasRef.current.width = 640;
                  canvasRef.current.height = 360;
                  heatmapRef.current.width = 640;
                  heatmapRef.current.height = 360;
                  
                  ctx.drawImage(videoRef.current, 0, 0, 640, 360);
                  
                  const { score, heatmap } = await neuralEngine.current.analyzeFrame(videoRef.current, canvasRef.current);
                  setNoiseScore(score);
                  if (heatmap) htx.putImageData(heatmap, 0, 0);

                  canvasRef.current.toBlob(async (blob) => {
                    if (blob) {
                      const buffer = await blob.arrayBuffer();
                      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
                      sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }));
                    }
                  }, 'image/jpeg', JPEG_QUALITY);
                }
              }
            }, 1000 / FRAME_RATE);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.outputTranscription) {
              const text = msg.serverContent.outputTranscription.text;
              setAnalysisText(prev => (prev + text).slice(-350));
              parseTelemetry(text);
            }
            if (msg.serverContent?.turnComplete) setAnalysisText('');
            
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              audioCursor = Math.max(audioCursor, outCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              source.start(audioCursor);
              audioCursor += buffer.duration;
            }
          },
          onclose: () => stopSecurityEngine(),
          onerror: () => stopSecurityEngine()
        }
      });
      sessionRef.current = sessionPromise;
    } catch (e) {
      setError("Failed to connect to security engine. Please check permissions.");
    }
  };

  const stopSecurityEngine = () => {
    setIsConnected(false);
    if (streamRef.current) clearInterval(streamRef.current);
    if (videoRef.current) {
      videoRef.current.src = "";
    }
    if (sessionRef.current) sessionRef.current.then((s: any) => s.close());
    setNoiseScore(0);
    setThreatScore(0);
  };

  return (
    <>
      {showDocs && <Documentation onClose={() => setShowDocs(false)} />}
      <Layout
        rightPanel={
          <>
            <div className="p-10 border-b border-white/20">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="w-5 h-5 text-[#00ffcc]" />
                  <h3 className="text-[11px] font-bold text-slate-100 uppercase tracking-[0.2em]">Security Overview</h3>
                </div>
                <button 
                  onClick={() => setShowDocs(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded border border-white/20 hover:bg-white/20 transition-all group"
                >
                  <FileText className="w-4 h-4 text-white group-hover:text-[#00ffcc]" />
                  <span className="text-[11px] font-black text-white uppercase tracking-widest group-hover:text-[#00ffcc]">Explanation</span>
                </button>
              </div>
              <div className="space-y-8">
                {[
                  { label: 'Overall Threat Risk', val: isConnected ? currentRisk : 0, color: currentRisk > Math.max(threatThreshold, noiseThreshold) ? '#ff0055' : '#00ffcc', bold: true },
                  { label: 'Context Logic Score', val: isConnected ? (100 - threatScore) : 0, color: '#ffffff' },
                  { label: 'Signal Health', val: isConnected ? (100 - noiseScore) : 0, color: '#00ffcc' },
                  { label: 'Sensor Integrity', val: isConnected ? signalStrength : 0, color: '#cbd5e1' }
                ].map((m, i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className={`text-[11px] font-black uppercase tracking-widest ${m.bold ? 'text-white' : 'text-slate-200'}`}>{m.label}</span>
                      <span className="text-sm font-bold mono" style={{ color: m.color }}>{isConnected ? m.val : '--'}%</span>
                    </div>
                    <div className={`bg-white/10 rounded-full overflow-hidden ${m.bold ? 'h-2' : 'h-1.5'}`}>
                      <div className="h-full transition-all duration-700 ease-out" style={{ width: `${m.val}%`, backgroundColor: m.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Configurable System Settings */}
            <div className="p-10 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3 mb-8">
                <Settings className="w-4 h-4 text-slate-400" />
                <h3 className="text-[11px] font-black text-slate-100 uppercase tracking-[0.2em]">System Config</h3>
              </div>
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Threat Alert</label>
                    <input 
                      type="range" min="0" max="100" 
                      value={threatThreshold} 
                      onChange={(e) => setThreatThreshold(parseInt(e.target.value))}
                      className="w-full accent-[#00ffcc]"
                    />
                    <span className="text-xs font-bold mono text-white mt-1 block">{threatThreshold}%</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Noise Alert</label>
                    <input 
                      type="range" min="0" max="100" 
                      value={noiseThreshold} 
                      onChange={(e) => setNoiseThreshold(parseInt(e.target.value))}
                      className="w-full accent-[#ff0055]"
                    />
                    <span className="text-xs font-bold mono text-white mt-1 block">{noiseThreshold}%</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Heatmap Opacity</label>
                  <input 
                    type="range" min="0" max="100" 
                    value={heatmapOpacity * 100} 
                    onChange={(e) => setHeatmapOpacity(parseInt(e.target.value) / 100)}
                    className="w-full accent-[#ffffff]"
                  />
                  <span className="text-xs font-bold mono text-white mt-1 block">{(heatmapOpacity * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col p-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[11px] font-black text-slate-100 uppercase tracking-[0.2em]">Activity Feed</h3>
                <Radio className={`w-4 h-4 ${isConnected ? 'text-[#00ffcc] animate-pulse' : 'text-slate-800'}`} />
              </div>
              
              {/* Log Filters */}
              <div className="flex flex-wrap gap-2 mb-8">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleFilter(cat)}
                    className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest border transition-all ${
                      activeFilters.includes(cat) 
                        ? 'bg-white text-black border-white' 
                        : 'bg-transparent text-slate-500 border-white/20 hover:border-white/40'
                    }`}
                  >
                    {cat.replace(' ', '_')}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto space-y-5 pr-4 scrollbar-hide">
                {filteredLogs.map(log => (
                  <div key={log.id} className={`p-6 rounded-lg border-2 transition-all ${
                    log.severity === AnomalySeverity.CRITICAL ? 'bg-[#ff0055]/20 border-[#ff0055] shadow-[0_0_15px_rgba(255,0,85,0.2)]' : 'bg-white/5 border-white/20'
                  }`}>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex flex-col">
                        <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${log.severity === AnomalySeverity.CRITICAL ? 'text-[#ff0055]' : 'text-[#00ffcc]'}`}>
                          {log.severity === AnomalySeverity.CRITICAL ? 'THREAT_ALERT' : 'STATUS_OK'}
                        </span>
                        {log.category && (
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{log.category}</span>
                        )}
                      </div>
                      <span className="text-[11px] font-black text-slate-100 mono">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-white font-medium">{log.description}</p>
                  </div>
                ))}
                {filteredLogs.length === 0 && (
                  <p className="text-center text-[12px] text-slate-500 font-black uppercase tracking-[0.5em] mt-32 opacity-40">
                    {isConnected ? 'No matching logs' : 'Ready to Scan'}
                  </p>
                )}
              </div>
            </div>

            <div className="p-10 bg-white/5 border-t border-white/20">
               <div className="flex flex-col gap-4">
                <input type="file" id="axon-upload" ref={fileInputRef} onChange={handleFileUpload} accept="video/*" className="hidden" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-4 py-6 rounded-xl bg-white text-black font-black text-[13px] uppercase tracking-[0.2em] hover:bg-[#00ffcc] hover:text-black transition-all shadow-xl"
                >
                  <Upload className="w-5 h-5" />
                  Upload Video
                </button>
                {isConnected && (
                  <button 
                    onClick={stopSecurityEngine}
                    className="flex items-center justify-center gap-4 py-4 rounded-xl border-2 border-[#ff0055] bg-[#ff0055]/10 text-[#ff0055] font-black text-[12px] uppercase tracking-widest hover:bg-[#ff0055]/20 transition-all"
                  >
                    <Power className="w-4 h-4" />
                    Stop Analysis
                  </button>
                )}
              </div>
            </div>
          </>
        }
      >
        <div className="grid grid-cols-12 gap-10 h-full content-start">
          <div className="col-span-12 xl:col-span-8 space-y-10">
            <div className={`relative aspect-video rounded-[2.5rem] overflow-hidden border-2 transition-all duration-1000 bg-[#010203] shadow-2xl ${
              currentRisk > Math.max(threatThreshold, noiseThreshold) ? 'border-[#ff0055] shadow-[0_0_100px_rgba(255,0,85,0.15)]' : 'border-white/20'
            }`}>
              <div className="grid-overlay" />
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                controls 
                className="w-full h-full object-cover grayscale-[0.1] brightness-[0.8] z-10" 
              />
              <canvas 
                ref={heatmapRef} 
                style={{ opacity: heatmapOpacity }}
                className="absolute inset-0 w-full h-full activation-map z-0 pointer-events-none transition-opacity duration-300" 
              />
              <canvas ref={canvasRef} className="hidden" />

              {isConnected && (
                <div className="absolute inset-0 pointer-events-none p-12 flex flex-col justify-between z-20">
                  <div className="flex justify-between items-start">
                    <div className="px-8 py-4 bg-black/90 backdrop-blur-3xl rounded-xl border-2 border-white/30 flex items-center gap-6">
                      <div className={`w-3 h-3 rounded-full ${currentRisk > Math.max(threatThreshold, noiseThreshold) ? 'bg-[#ff0055] animate-pulse' : 'bg-[#00ffcc]'}`} />
                      <span className="text-[13px] font-black text-white uppercase tracking-[0.5em]">
                        Scanning_Stream
                      </span>
                    </div>
                    <div className="bg-black/90 backdrop-blur-xl border-2 border-white/30 rounded-xl px-8 py-4 text-right">
                      <span className="text-[10px] font-black text-slate-300 uppercase block mb-1 tracking-widest">Image Noise Level</span>
                      <span className="text-xl font-bold text-white mono">{noiseVariance.toFixed(4)}</span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="px-14 py-8 bg-black/95 backdrop-blur-3xl rounded-[3rem] border-2 border-white/30 max-w-3xl shadow-2xl">
                      <p className="text-[14px] font-bold text-white text-center leading-relaxed tracking-wide italic">
                        {analysisText || "Analyzing footage for potential security threats..."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!isConnected && !error && (
                <div className="absolute inset-0 bg-[#010203] flex flex-col items-center justify-center p-20 z-30">
                  <div className="axon-logo scale-[3] mb-24">
                     <div className="delta-shape">
                        <div className="delta-inner" />
                     </div>
                     <div className="pulse-line" />
                  </div>
                  <h2 className="text-6xl font-black text-white mb-8 tracking-tighter uppercase">System Ready</h2>
                  <p className="text-slate-300 text-[13px] font-black uppercase tracking-[1em] text-center leading-relaxed max-w-md opacity-60">
                    Awaiting Video Link.<br/>Please upload footage to begin analysis.
                  </p>
                </div>
              )}
              
              {error && (
                <div className="absolute inset-0 bg-[#010203] z-50 flex flex-col items-center justify-center text-center p-20">
                  <ShieldAlert className="w-28 h-28 text-[#ff0055] mb-12" />
                  <h2 className="text-5xl font-black text-white mb-6 uppercase tracking-tighter">Connection Error</h2>
                  <p className="text-[#ff0055] text-[14px] font-black uppercase tracking-widest leading-loose max-w-xs">{error}</p>
                  <button onClick={startSecurityEngine} className="mt-16 px-16 py-5 bg-[#ff0055] text-white rounded-xl font-black text-[13px] uppercase tracking-widest hover:brightness-110 transition-all">Retry System Link</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-10">
               <div className="p-12 glass-panel rounded-[3rem]">
                  <div className="flex justify-between items-center mb-12">
                     <h3 className="text-[11px] font-black text-slate-100 uppercase tracking-[0.3em]">Stability Tracker</h3>
                     <span className="text-[11px] font-black text-[#00ffcc] uppercase mono tracking-widest">Live</span>
                  </div>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00ffcc" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#00ffcc" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis domain={[0, 100]} hide />
                        <Area type="monotone" dataKey="value" stroke="#00ffcc" fillOpacity={1} fill="url(#colorValue)" strokeWidth={4} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="p-12 glass-panel rounded-[3rem] flex flex-col justify-between">
                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Risk Level</span>
                      <div className="flex items-baseline gap-3">
                         <span className="text-6xl font-black text-white tracking-tighter">{isConnected ? (100 - currentRisk) : '--'}</span>
                         <span className="text-[14px] font-black text-slate-400">%</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Analysis Delay</span>
                      <div className="flex items-baseline gap-3">
                         <span className="text-6xl font-black text-[#00ffcc] tracking-tighter">{isConnected ? '1.9' : '--'}</span>
                         <span className="text-[14px] font-black text-slate-400">ms</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-10 border-t-2 border-white/20 flex justify-between items-center">
                     <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Security Engine</span>
                     <span className="text-[11px] font-black text-white mono uppercase tracking-widest">Active</span>
                  </div>
               </div>
            </div>
          </div>

          <div className="col-span-12 xl:col-span-4 space-y-10">
            <div className="p-12 glass-panel rounded-[3.5rem]">
               <div className="flex items-center gap-5 mb-12">
                  <Target className="w-8 h-8 text-[#ff0055]" />
                  <h3 className="text-[13px] font-black text-white uppercase tracking-[0.4em]">Threat Summary</h3>
               </div>
               <div className="p-10 bg-black/60 rounded-[2.5rem] border-2 border-white/10 mb-12 shadow-inner">
                  <div className="flex justify-between items-center mb-8">
                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Safety Rating</span>
                    <span className={`text-[12px] font-black uppercase tracking-widest ${currentRisk > Math.max(threatThreshold, noiseThreshold) ? 'text-[#ff0055]' : 'text-[#00ffcc]'}`}>
                      {currentRisk > Math.max(threatThreshold, noiseThreshold) ? 'LOW' : 'HIGH'}
                    </span>
                  </div>
                  <p className="text-[15px] leading-relaxed text-white font-bold">
                    {currentRisk > Math.max(threatThreshold, noiseThreshold) 
                      ? "The system has detected a potential security risk in the current video frame. The autonomous system may be compromised." 
                      : "The video stream appears safe. No patterns of manipulation or digital noise have been detected."}
                  </p>
               </div>
               <div className="flex items-center gap-5 px-4">
                  <Zap className="w-6 h-6 text-[#00ffcc] animate-pulse" />
                  <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.6em]">Continuous Scan Active</span>
               </div>
            </div>

            <div className="bg-[#00ffcc]/10 p-14 rounded-[3.5rem] border-2 border-[#00ffcc]/30 text-center shadow-2xl relative overflow-hidden group">
               <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#00ffcc]/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
               <Cpu className="w-16 h-16 text-[#00ffcc] mx-auto mb-10 opacity-70" />
               <h4 className="text-[16px] font-black text-white uppercase mb-6 tracking-[0.3em]">Detection Priorities</h4>
               <p className="text-[13px] text-white font-black leading-relaxed uppercase tracking-widest">
                 Noise Filter: 55% <br/>Context Logic: 45%
               </p>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default App;
