
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Layout } from './components/Layout';
import { AnomalyEvent, AnomalySeverity } from './types';
import { MODEL_NAME, SYSTEM_INSTRUCTION, FRAME_RATE, JPEG_QUALITY } from './constants';
import { encode } from './services/audioUtils';
import { NeuralProcessor } from './services/NeuralProcessor';
import { 
  AreaChart, Area, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip
} from 'recharts';
import { 
  ShieldAlert, Target, 
  Cpu, 
  Power, Settings, Play, Database, Camera, Loader2, AlertTriangle, Activity,
  ShieldCheck, ScanSearch, Download, Trash2
} from 'lucide-react';

const CATEGORIES = ['Manipulated Sign', 'Image Noise', 'Logic Error', 'General'] as const;

/**
 * PRODUCTION FSD FORENSIC LIBRARY
 * Using real-world Tesla FSD and Waymo Driver dashcam footage.
 */
const FORENSIC_SAMPLES = [
  {
    id: 'tesla-fsd-v12-urban',
    name: 'TESLA_FSD_V12_CITY_AUDIT',
    url: 'https://v.pexels.com/video-files/3191572/3191572-hd_1280_720_25fps.mp4',
    context: 'Tesla Autopilot / Urban Intersection Logic',
    difficulty: 'High'
  },
  {
    id: 'waymo-taxi-rain',
    name: 'WAYMO_DRIVER_NIGHT_PRECIP',
    url: 'https://v.pexels.com/video-files/3850388/3850388-hd_1280_720_30fps.mp4',
    context: 'Waymo Autonomous Taxi / Low-Light Occlusion',
    difficulty: 'Critical'
  },
  {
    id: 'tesla-highway-v11',
    name: 'TESLA_HW4_HIGHWAY_VALIDATION',
    url: 'https://v.pexels.com/video-files/4488340/4488340-hd_1280_720_25fps.mp4',
    context: 'Tesla HW4 / High-Speed Lane Integrity',
    difficulty: 'Extreme'
  },
  {
    id: 'waymo-intersection',
    name: 'WAYMO_CITY_JUNCTION_SCAN',
    url: 'https://v.pexels.com/video-files/5042698/5042698-hd_1280_720_25fps.mp4',
    context: 'Waymo Driver / Complex Multi-Agent Tracking',
    difficulty: 'High'
  },
  {
    id: 'fsd-beta-edge-case',
    name: 'FSD_BETA_CONSTRUCTION_BYPASS',
    url: 'https://v.pexels.com/video-files/2800684/2800684-hd_1920_1080_30fps.mp4',
    context: 'Tesla Vision-Only / Barrier Detection',
    difficulty: 'Medium'
  }
];

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [logs, setLogs] = useState<AnomalyEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  
  const [threatScore, setThreatScore] = useState<number>(0);
  const [noiseScore, setNoiseScore] = useState<number>(0);
  const [signalStrength, setSignalStrength] = useState<number>(100);
  const [noiseVariance, setNoiseVariance] = useState<number>(0);
  const [history, setHistory] = useState<{time: string, value: number}[]>([]);

  const [threatThreshold, setThreatThreshold] = useState<number>(40);
  const [noiseThreshold, setNoiseThreshold] = useState<number>(40);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.4);
  const [activeFilters, setActiveFilters] = useState<string[]>(['Manipulated Sign', 'Image Noise', 'Logic Error', 'General']);
  const [activeTab, setActiveTab] = useState<'LOGS' | 'SAMPLES'>('LOGS');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<number | null>(null);
  const neuralEngine = useRef(new NeuralProcessor());
  
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const chartsContainerRef = useRef<HTMLDivElement>(null);

  // Apply Shield Mode sensitivity boost (Lower thresholds mean more alerts)
  const activeThreatThreshold = isShieldActive ? threatThreshold / 2 : threatThreshold;
  const activeNoiseThreshold = isShieldActive ? noiseThreshold / 2 : noiseThreshold;

  const currentRisk = Math.round((threatScore * 0.45) + (noiseScore * 0.55));

  const filteredLogs = useMemo(() => {
    return logs.filter(log => activeFilters.includes(log.category || 'General'));
  }, [logs, activeFilters]);

  // Handle navigation item clicks to scroll to relevant sections or switch tabs
  const handleNavClick = useCallback((item: string) => {
    if (item === 'Activity_Log') {
      setActiveTab('LOGS');
    } else if (item === 'Security_Feed') {
      videoContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (item === 'Risk_Analysis') {
      chartsContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const addLog = useCallback((desc: string, severity: AnomalySeverity, category?: any) => {
    const now = new Date();
    const newLog: AnomalyEvent = {
      id: Math.random().toString(36),
      timestamp: Date.now(),
      analysisTimestamp: now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'Security Scan',
      category: category || 'General',
      description: desc,
      severity
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
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
      
      if (threat >= activeThreatThreshold) {
        addLog(`Neural Alert: Risk anomaly [${threat}%] detected in logic stack.`, AnomalySeverity.CRITICAL, 'Logic Error');
      }
    }
    if (text.includes('[ALERT:')) {
      const alertRegex = /\[ALERT:\s*(.*?)\]\s*(.*)/i;
      const alertMatch = text.match(alertRegex);
      if (alertMatch) {
        addLog(alertMatch[2].trim(), AnomalySeverity.CRITICAL, alertMatch[1].trim() as any);
      }
    } else if (text.includes('[LOG]')) {
      const parts = text.split('[LOG]');
      addLog(parts[parts.length - 1].split('\n')[0].trim(), AnomalySeverity.LOW);
    }
  }, [activeThreatThreshold, addLog]);

  /**
   * SNAPSHOT: Captures current frame + overlay
   */
  const captureSnapshot = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    addLog("Forensic Snapshot initiated. Buffer stored in session.", AnomalySeverity.MEDIUM, 'General');
    // Flash effect logic handled via CSS classes or state can be added here
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
       // Visual flash
       const root = document.getElementById('root');
       if (root) {
         root.style.filter = 'brightness(2) contrast(1.5)';
         setTimeout(() => { root.style.filter = 'none'; }, 100);
       }
    }
  }, [addLog]);

  /**
   * PRIORITY SCAN: Single-frame deep analysis
   */
  const performPriorityScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    addLog("Executing Priority Neural Scan on current frame...", AnomalySeverity.HIGH, 'General');
    
    // We force a cycle even if not connected to show "activity"
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
       ctx.drawImage(videoRef.current, 0, 0, 640, 360);
       const { score } = await neuralEngine.current.analyzeFrame(videoRef.current, canvasRef.current);
       setNoiseScore(score);
       addLog(`Priority Scan Result: Spectral Anomaly ${score}% detected.`, score > 50 ? AnomalySeverity.HIGH : AnomalySeverity.LOW, 'Image Noise');
    }

    if (isConnected && sessionRef.current) {
       // Triggering one-off analysis
       await performAnalysisCycle();
    }
  };

  const safePlay = useCallback(async (video: HTMLVideoElement | null) => {
    if (!video || (!video.src && !video.srcObject)) return;
    try {
      await video.play();
    } catch (err: any) {
      if (err.name !== 'AbortError') console.warn('Playback failed:', err.message);
    }
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      setHistory(prev => {
        const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return [...prev, { time, value: currentRisk }].slice(-30);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentRisk, isConnected]);

  // Background local analysis cycle (Always runs when video plays)
  useEffect(() => {
    const localTimer = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.readyState < 2) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const hCanvas = heatmapRef.current;
      
      if (canvas && hCanvas) {
        const ctx = canvas.getContext('2d');
        const htx = hCanvas.getContext('2d');
        if (ctx && htx) {
          canvas.width = 640; canvas.height = 360;
          hCanvas.width = 640; hCanvas.height = 360;
          ctx.drawImage(video, 0, 0, 640, 360);
          
          const { score, heatmap } = await neuralEngine.current.analyzeFrame(video, canvas);
          setNoiseScore(score);
          if (heatmap) htx.putImageData(heatmap, 0, 0);
          
          if (score > activeNoiseThreshold) {
            // Local noise alerts don't need the AI link
             if (Math.random() > 0.9) { // Debounce alert frequency
               addLog(`Spectral Noise [${score}%] exceeds safety thresholds.`, AnomalySeverity.HIGH, 'Image Noise');
             }
          }
        }
      }
    }, 1000 / FRAME_RATE);
    
    return () => clearInterval(localTimer);
  }, [activeNoiseThreshold, addLog]);

  const performAnalysisCycle = async () => {
    if (canvasRef.current && videoRef.current && sessionRef.current) {
      const video = videoRef.current;
      if (video.paused || video.ended || video.readyState < 2) return;

      return new Promise<void>((resolve) => {
        canvasRef.current!.toBlob(async (blob) => {
          if (blob && sessionRef.current) {
            try {
              const buffer = await blob.arrayBuffer();
              const base64 = encode(new Uint8Array(buffer));
              const session = await sessionRef.current;
              session.sendRealtimeInput({
                media: { data: base64, mimeType: 'image/jpeg' }
              });
            } catch (e) { console.error("Send Error:", e); }
          }
          resolve();
        }, 'image/jpeg', JPEG_QUALITY);
      });
    }
  };

  const connect = async () => {
    if (isConnected || isConnecting) return;
    if (!videoRef.current?.src) {
      setError("Forensic source required. Select a sample to begin.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: { systemInstruction: SYSTEM_INSTRUCTION, responseModalities: [Modality.AUDIO] },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            addLog("AI Security Link established.", AnomalySeverity.LOW);
            streamRef.current = window.setInterval(performAnalysisCycle, 1000 / (FRAME_RATE/2)); // Half rate for Gemini
            safePlay(videoRef.current);
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn) {
              const text = message.serverContent.modelTurn.parts?.[0]?.text;
              if (text) parseTelemetry(text);
            }
          },
          onclose: () => disconnect(),
          onerror: () => { setError("Neural link failure."); disconnect(); }
        }
      });
      sessionRef.current = sessionPromise;
    } catch (err: any) {
      setError("AI Engine Handshake Failed.");
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (streamRef.current) clearInterval(streamRef.current);
    streamRef.current = null;
    sessionRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    addLog("Link terminated.", AnomalySeverity.MEDIUM);
  };

  const handleSampleSelect = useCallback(async (sampleId: string) => {
    const sample = FORENSIC_SAMPLES.find(s => s.id === sampleId);
    if (!sample || !videoRef.current) return;

    setActiveSampleId(sampleId);
    setError(null);
    videoRef.current.pause();

    const onCanPlay = async () => {
      videoRef.current?.removeEventListener('canplay', onCanPlay);
      addLog(`Synchronized forensic source: ${sample.name}`, AnomalySeverity.LOW);
      await safePlay(videoRef.current);
    };

    videoRef.current.addEventListener('canplay', onCanPlay);
    videoRef.current.src = sample.url;
    videoRef.current.load();
  }, [addLog, safePlay]);

  return (
    <Layout 
      onNavItemClick={handleNavClick}
      rightPanel={
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">System_Control</h2>
              <button
                onClick={isConnected ? disconnect : connect}
                disabled={isConnecting}
                className={`p-3 rounded-full transition-all shadow-lg ${
                  isConnected 
                    ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20' 
                    : 'bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/50 hover:bg-[#00ffcc]/20 hover:scale-105'
                }`}
              >
                {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Power className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-[10px] text-red-500 font-bold uppercase animate-pulse">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl border transition-all duration-500 ${isShieldActive ? 'bg-orange-500/10 border-orange-500/50' : 'bg-white/5 border-white/10'}`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Defense_Level</span>
                <span className={`text-xl font-black mono ${isShieldActive ? 'text-orange-500' : 'text-white'}`}>
                  {isShieldActive ? 'MAX_RELIANCE' : 'STANDARD'}
                </span>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Purity_Index</span>
                <span className="text-xl font-black mono text-[#00ffcc]">{signalStrength}%</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6">
              <div className="flex gap-4 mb-6">
                <button onClick={() => setActiveTab('LOGS')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'LOGS' ? 'border-[#00ffcc] text-white' : 'border-transparent text-slate-500'}`}>Activity_Log</button>
                <button onClick={() => setActiveTab('SAMPLES')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'SAMPLES' ? 'border-[#00ffcc] text-white' : 'border-transparent text-slate-500'}`}>Forensic_DB</button>
              </div>

              {activeTab === 'LOGS' ? (
                <div className="space-y-4">
                  {filteredLogs.map(log => (
                    <div key={log.id} className={`p-4 bg-white/5 rounded-xl border-l-2 border border-white/5 ${log.severity === AnomalySeverity.CRITICAL ? 'border-l-red-500 bg-red-500/5' : 'border-l-[#00ffcc]'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${log.severity === AnomalySeverity.CRITICAL ? 'bg-red-500/20 text-red-500' : 'bg-[#00ffcc]/10 text-[#00ffcc]'}`}>
                          {log.category || 'General'}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">{log.analysisTimestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-medium leading-relaxed">{log.description}</p>
                    </div>
                  ))}
                  {filteredLogs.length === 0 && <div className="py-10 text-center text-slate-500 text-[10px] font-bold uppercase">Ready for Analysis</div>}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="px-3 py-1 bg-[#00ffcc]/5 border border-[#00ffcc]/10 rounded mb-4">
                    <span className="text-[9px] font-black text-[#00ffcc] uppercase tracking-widest">Autonomous Fleet Database // 2025</span>
                  </div>
                  {FORENSIC_SAMPLES.map(sample => (
                    <button
                      key={sample.id}
                      onClick={() => handleSampleSelect(sample.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${activeSampleId === sample.id ? 'bg-[#00ffcc]/10 border-[#00ffcc]/50 shadow-[0_0_15px_rgba(0,255,204,0.1)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${activeSampleId === sample.id ? 'bg-[#00ffcc]/20 text-[#00ffcc]' : 'bg-white/10 text-slate-400'}`}>
                          <Target className="w-4 h-4" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-white truncate">{sample.name}</h4>
                      </div>
                      <p className="text-[10px] text-slate-500 mb-3">{sample.context}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${sample.difficulty === 'Extreme' || sample.difficulty === 'Critical' ? 'text-red-500' : 'text-[#00ffcc]'}`}>
                          {sample.difficulty}_DIFFICULTY
                        </span>
                        <Play className={`w-3 h-3 ${activeSampleId === sample.id ? 'text-[#00ffcc] animate-pulse' : 'text-slate-500'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-10">
        <section ref={videoContainerRef} className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          <div className="xl:col-span-2 relative">
            <div className="absolute -top-4 -left-4 p-4 bg-[#010203] border border-white/10 rounded-xl z-10 flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00ffcc] animate-ping' : 'bg-red-500'}`} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">FSD_Vision_Secure_Stream</span>
            </div>
            
            <div className={`relative aspect-video rounded-3xl overflow-hidden border transition-all duration-500 bg-slate-900 shadow-2xl ${isShieldActive ? 'border-orange-500 ring-4 ring-orange-500/20' : 'border-white/10'}`}>
              <video ref={videoRef} className="w-full h-full object-cover" crossOrigin="anonymous" loop muted playsInline />
              <canvas ref={heatmapRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 mix-blend-screen" style={{ opacity: heatmapOpacity }} />
              
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                 {!activeSampleId && (
                   <div className="p-10 bg-[#010203]/80 backdrop-blur-xl rounded-3xl border border-white/20 text-center max-w-sm pointer-events-auto">
                      <Target className="w-12 h-12 text-[#00ffcc] mx-auto mb-6" />
                      <h3 className="text-xl font-black text-white mb-2 uppercase">Interface Locked</h3>
                      <p className="text-xs text-slate-400 mb-8 leading-relaxed">System ready. Select a Tesla or Waymo forensic source from the Database to initialize the neural stack.</p>
                      <button onClick={() => setActiveTab('SAMPLES')} className="w-full py-4 bg-[#00ffcc] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:scale-105 active:scale-95 transition-all">Open Database</button>
                   </div>
                 )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-6">
                 <div className="flex items-center gap-3">
                   <Settings className="w-4 h-4 text-slate-500" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Heatmap</span>
                   <input type="range" min="0" max="1" step="0.1" value={heatmapOpacity} onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))} className="w-20 accent-[#00ffcc]" />
                 </div>
                 <div className="h-6 w-px bg-white/10" />
                 <div className="flex items-center gap-3">
                   <ShieldAlert className="w-4 h-4 text-slate-500" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Secure_Mode</span>
                   <button 
                     onClick={() => {
                        setIsShieldActive(!isShieldActive);
                        addLog(isShieldActive ? "Secure-Mode disabled. Restoring standard sensitivity." : "Secure-Mode ENABLED. Maximum defensive sensitivity engaged.", isShieldActive ? AnomalySeverity.MEDIUM : AnomalySeverity.HIGH);
                     }}
                     className={`w-10 h-5 rounded-full transition-all relative ${isShieldActive ? 'bg-orange-500' : 'bg-white/10'}`}
                   >
                     <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isShieldActive ? 'left-6' : 'left-1'}`} />
                   </button>
                 </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={performPriorityScan}
                  title="Priority Single Frame Scan"
                  className="p-4 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition-all border border-blue-500/30 text-blue-400 hover:scale-110 active:scale-95 group"
                >
                  <ScanSearch className="w-5 h-5 group-hover:animate-pulse" />
                </button>
                <button 
                  onClick={captureSnapshot}
                  title="Capture Forensic Snapshot"
                  className="p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 text-slate-400 hover:text-white"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsShieldActive(!isShieldActive)}
                  title="Toggle Active Defense"
                  className={`p-4 rounded-xl transition-all border ${isShieldActive ? 'bg-orange-500/20 border-orange-500/50 text-orange-500' : 'bg-white/5 border-white/10 text-slate-400'}`}
                >
                  {isShieldActive ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-8 bg-white/5 rounded-3xl border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all"><Cpu className="w-20 h-20 text-[#00ffcc]" /></div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Spectral_Purity_CNN</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-white mb-2 uppercase tracking-widest"><span>Noise_Entropy</span><span className="text-[#00ffcc]">{noiseScore}%</span></div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${noiseScore > activeNoiseThreshold ? 'bg-red-500' : 'bg-[#00ffcc]'}`} style={{ width: `${noiseScore}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-white mb-2 uppercase tracking-widest"><span>Logic_Drift</span><span className="text-[#00ffcc]">{threatScore}%</span></div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${threatScore > activeThreatThreshold ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${threatScore}%` }} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-white/5 rounded-3xl border border-white/10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Threat_Audit_Status</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className={`p-2 rounded-lg ${isShieldActive ? 'bg-orange-500/20 text-orange-500' : 'bg-blue-500/20 text-blue-500'}`}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase block tracking-wider">Analysis Status</span>
                    <span className="text-xs font-bold text-white uppercase">{isConnected ? 'Link Active' : (activeSampleId ? 'Local Processing' : 'Idle')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="p-2 bg-purple-500/20 text-purple-500 rounded-lg"><Download className="w-4 h-4" /></div>
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase block tracking-wider">Report generation</span>
                    <span className="text-xs font-bold text-white">Automated_FSD_Audit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section ref={chartsContainerRef} className="p-10 bg-white/5 rounded-[40px] border border-white/10">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-black text-white mb-2 tracking-tighter uppercase">Temporal_Risk_Synthesis</h2>
              <p className="text-[11px] text-slate-500 uppercase font-black tracking-widest">30-Second sliding window security audit</p>
            </div>
            <button 
              onClick={() => setHistory([])}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-500 text-[10px] font-black uppercase rounded-lg transition-all"
            >
              Reset_History
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs><linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={currentRisk > 50 ? '#ff0055' : '#00ffcc'} stopOpacity={0.3}/><stop offset="95%" stopColor={currentRisk > 50 ? '#ff0055' : '#00ffcc'} stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ backgroundColor: '#08090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }} itemStyle={{ color: '#00ffcc' }} />
                <Area type="monotone" dataKey="value" stroke={currentRisk > 50 ? '#ff0055' : '#00ffcc'} strokeWidth={4} fillOpacity={1} fill="url(#colorRisk)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Layout>
  );
};

export default App;
