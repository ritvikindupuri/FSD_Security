
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  rightPanel: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, rightPanel }) => {
  return (
    <div className="flex flex-col h-screen text-slate-100 bg-[#010203]">
      {/* Main Header */}
      <header className="h-20 px-10 border-b border-white/20 bg-[#010203]/95 backdrop-blur-3xl flex items-center justify-between z-50">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-5">
            <div className="axon-logo">
              <div className="delta-shape">
                <div className="delta-inner" />
              </div>
              <div className="pulse-line" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white leading-none">AXON.SEC</h1>
              <span className="text-[10px] font-bold text-[#00ffcc] uppercase tracking-[0.4em] block mt-1">Vision Security</span>
            </div>
          </div>

          <nav className="hidden xl:flex items-center gap-10 pl-10 border-l border-white/20">
            {['Activity_Log', 'Risk_Analysis', 'Security_Feed'].map((item) => (
              <span key={item} className="text-[11px] font-bold uppercase tracking-widest text-slate-200 cursor-default hover:text-white transition-colors">
                {item}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-10">
          <div className="hidden lg:flex gap-10 text-right">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5 tracking-wider">Processing Time</span>
              <span className="text-sm font-bold mono text-[#00ffcc]">0.009ms</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5 tracking-wider">System Status</span>
              <span className="text-sm font-bold mono text-white uppercase">Active</span>
            </div>
          </div>
          <div className="px-6 py-2 bg-white/10 rounded-lg border border-white/20 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#00ffcc] animate-pulse" />
            <span className="text-[11px] font-black tracking-widest uppercase text-white">Monitoring</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-10 bg-[#010203]">
          {children}
        </main>

        <aside className="w-[420px] bg-[#08090b] border-l border-white/20 flex flex-col shadow-2xl relative">
          <div className="absolute top-0 right-0 w-[2px] h-full bg-[#00ffcc]/10" />
          {rightPanel}
        </aside>
      </div>
    </div>
  );
};
