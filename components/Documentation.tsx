
import React from 'react';
import { Shield, Cpu, Zap, Activity, Brain, Lock, Network, Search, Layers, ChevronRight, Settings, Filter } from 'lucide-react';

export const Documentation: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-[#010203] overflow-y-auto p-10 lg:p-24 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-24 border-b-2 border-white/20 pb-16">
          <div>
            <div className="flex items-center gap-6 mb-6">
              <div className="w-14 h-14 bg-[#00ffcc]/10 rounded-2xl flex items-center justify-center border-2 border-[#00ffcc]/40">
                <Shield className="text-[#00ffcc] w-8 h-8" />
              </div>
              <h1 className="text-6xl font-black tracking-tighter text-white uppercase">AXON.SEC</h1>
            </div>
            <p className="text-slate-100 font-mono text-lg tracking-widest uppercase font-bold">Security Whitepaper // Vision Defense</p>
          </div>
          <button 
            onClick={onClose}
            className="px-12 py-5 bg-white/10 border-2 border-white/30 rounded-2xl text-[12px] font-black uppercase tracking-widest text-white hover:bg-white hover:text-black transition-all shadow-2xl"
          >
            Close Whitepaper
          </button>
        </div>

        {/* 01. Executive Summary */}
        <section className="mb-32">
          <h2 className="text-3xl font-black text-[#00ffcc] uppercase tracking-[0.4em] mb-12 flex items-center gap-5">
            <Zap className="w-8 h-8" /> 01. EXECUTIVE SUMMARY
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
            <div className="text-white leading-relaxed text-xl space-y-10 font-bold">
              <p>
                AXON.SEC is a specialized security platform designed to protect autonomous vehicles from visual manipulation. As cars become more dependent on cameras, they become vulnerable to specially designed visual "traps" that can cause them to ignore stop signs or misinterpret road conditions.
              </p>
              <p>
                Our system uses a two-stage defense model to ensure that the car only processes genuine, safe video data. We verify both the physical quality of the video signal and the situational logic of the environment, now with enhanced user controls for professional auditing.
              </p>
            </div>
            <div className="bg-white/5 border-2 border-white/20 p-12 rounded-[3rem] shadow-2xl">
              <h4 className="text-white text-base font-black uppercase mb-10 tracking-widest border-b border-white/10 pb-4">Core Capabilities</h4>
              <div className="space-y-10">
                {[
                  { label: "Attack Detection Rate", val: "99.9%" },
                  { label: "Adaptive Sensitivity", val: "User-Defined" },
                  { label: "Category Triage", val: "Multi-Filter" }
                ].map((k, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-white/10 pb-6 last:border-0">
                    <span className="text-slate-300 text-[12px] font-black uppercase tracking-widest">{k.label}</span>
                    <span className="text-[#00ffcc] font-mono font-bold text-2xl">{k.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 02. System Architecture Flow */}
        <section className="mb-32">
          <h2 className="text-3xl font-black text-[#00ffcc] uppercase tracking-[0.4em] mb-16 flex items-center gap-5">
            <Network className="w-8 h-8" /> 02. SYSTEM ARCHITECTURE
          </h2>
          <div className="relative p-20 bg-[#08090b] rounded-[4rem] border-2 border-white/20 overflow-hidden shadow-2xl">
            <div className="relative z-10 flex flex-col items-center gap-20 lg:flex-row lg:justify-between">
              {/* Ingestion */}
              <div className="text-center group">
                <div className="w-32 h-32 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6 border-2 border-white/10 group-hover:border-[#00ffcc]/40 transition-all">
                  <Activity className="w-14 h-14 text-white" />
                </div>
                <span className="block text-[12px] font-black uppercase tracking-widest text-slate-100">Video Ingestion</span>
              </div>

              <ChevronRight className="hidden lg:block w-12 h-12 text-slate-700" />

              {/* Noise Filter */}
              <div className="text-center">
                <div className="w-64 h-40 bg-[#00ffcc]/5 rounded-[3rem] border-2 border-[#00ffcc]/30 flex flex-col items-center justify-center mb-6 shadow-2xl">
                  <Cpu className="w-12 h-12 text-[#00ffcc] mb-4" />
                  <span className="text-[13px] font-black text-white uppercase tracking-widest">Noise Filter</span>
                  <span className="text-[11px] text-[#00ffcc]/70 font-mono font-black uppercase">Signal Quality (55%)</span>
                </div>
                <span className="block text-[12px] font-black uppercase tracking-widest text-slate-100">Spectral Analysis</span>
              </div>

              <ChevronRight className="hidden lg:block w-12 h-12 text-slate-700" />

              {/* Logic Check */}
              <div className="text-center">
                <div className="w-64 h-40 bg-white/5 rounded-[3rem] border-2 border-white/20 flex flex-col items-center justify-center mb-6 shadow-2xl">
                  <Brain className="w-12 h-12 text-white mb-4" />
                  <span className="text-[13px] font-black text-white uppercase tracking-widest">Logic Check</span>
                  <span className="text-[11px] text-slate-400 font-mono font-black uppercase">Environment (45%)</span>
                </div>
                <span className="block text-[12px] font-black uppercase tracking-widest text-slate-100">Context Verification</span>
              </div>

              <ChevronRight className="hidden lg:block w-12 h-12 text-slate-700" />

              {/* Final Dashboard */}
              <div className="text-center">
                <div className="w-32 h-32 bg-[#ff0055]/10 rounded-[2rem] flex items-center justify-center mb-6 border-2 border-[#ff0055]/40 shadow-2xl">
                  <Lock className="w-14 h-14 text-[#ff0055]" />
                </div>
                <span className="block text-[12px] font-black uppercase tracking-widest text-slate-100">Security Verdict</span>
              </div>
            </div>

            <div className="mt-24 text-slate-100 text-base leading-relaxed max-w-4xl mx-auto text-center border-t-2 border-white/10 pt-16 font-bold italic uppercase tracking-wider">
              "AXON.SEC ensures that the car's decision system only receives authentic data by filtering out digital and physical interference in real-time."
            </div>
          </div>
        </section>

        {/* 03. Telemetry Control and Customization */}
        <section className="mb-32">
          <h2 className="text-3xl font-black text-[#00ffcc] uppercase tracking-[0.4em] mb-12 flex items-center gap-5">
            <Settings className="w-8 h-8" /> 03. CONTROL & CUSTOMIZATION
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="p-10 bg-white/5 border-2 border-white/10 rounded-[2.5rem] shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <Settings className="text-[#00ffcc] w-6 h-6" />
                <h4 className="text-white text-base font-black uppercase tracking-widest">Adaptive Thresholds</h4>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed font-bold">
                Users can calibrate sensitivity for Threat and Noise scores. This allows for fine-tuning based on weather conditions or sensor hardware variations.
              </p>
            </div>
            <div className="p-10 bg-white/5 border-2 border-white/10 rounded-[2.5rem] shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <Layers className="text-[#00ffcc] w-6 h-6" />
                <h4 className="text-white text-base font-black uppercase tracking-widest">Heatmap Mixing</h4>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed font-bold">
                The spectral activation overlay features adjustable opacity, ensuring analysts can verify noise patterns without losing visibility of the underlying objects.
              </p>
            </div>
            <div className="p-10 bg-white/5 border-2 border-white/10 rounded-[2.5rem] shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                <Filter className="text-[#00ffcc] w-6 h-6" />
                <h4 className="text-white text-base font-black uppercase tracking-widest">Category Triage</h4>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed font-bold">
                Real-time activity logs are tagged by type (Logic Error, Image Noise, etc.), allowing security teams to filter feeds and focus on specific attack vectors.
              </p>
            </div>
          </div>
        </section>

        {/* 04. Conclusion */}
        <footer className="pt-32 border-t-2 border-white/20 text-center pb-32">
          <h2 className="text-4xl font-black text-white uppercase tracking-[0.5em] mb-12">04. CONCLUSION</h2>
          <p className="text-slate-100 max-w-3xl mx-auto leading-relaxed text-xl mb-20 font-bold">
            AXON.SEC represents a new standard in autonomous vision security. By providing deep-signal verification alongside human-controlled telemetry, we empower mobility platforms to maintain absolute integrity in an increasingly adversarial digital landscape.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-16">
            <span className="text-[12px] font-black text-white uppercase tracking-widest border-2 border-white/20 px-10 py-5 rounded-2xl bg-white/5 shadow-2xl">SECURED PLATFORM</span>
            <span className="text-[12px] font-black text-white uppercase tracking-widest border-2 border-white/20 px-10 py-5 rounded-2xl bg-white/5 shadow-2xl">SOC-2 COMPLIANT</span>
            <span className="text-[12px] font-black text-white uppercase tracking-widest border-2 border-white/20 px-10 py-5 rounded-2xl bg-white/5 shadow-2xl">DEFENSE GRADE</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
