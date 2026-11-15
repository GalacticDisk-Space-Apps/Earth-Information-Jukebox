import React from 'react';
import { motion } from 'motion/react';
import {
  useActiveTrack,
  useFrameIndex,
  useMode,
  useCursor,
  useIsPlaying,
  useIsMuted,
  useReducedMotion,
} from '@/store/useJukebox';
import { Globe } from '@/globe/Globe';
import { Deck } from '@/ui/Deck';
import { Legend } from '@/ui/Legend';
import { InspectPanel } from '@/ui/InspectPanel';

interface LayoutProps {
  onOpenHelp?: () => void;
  isEntering?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ onOpenHelp, isEntering = false }) => {
  const activeTrack = useActiveTrack();
  const frameIndex = useFrameIndex();
  const mode = useMode();
  const cursor = useCursor();
  const isPlaying = useIsPlaying();
  const isMuted = useIsMuted();
  const reducedMotion = useReducedMotion();

  const currentYear = activeTrack?.frames[frameIndex] ?? '2004';
  const trackTitle = activeTrack?.title ?? 'No Track Selected';

  const cursorFormatted = cursor
    ? `${Math.abs(cursor.lat).toFixed(1)}°${cursor.lat >= 0 ? 'N' : 'S'}, ${Math.abs(cursor.lon).toFixed(1)}°${cursor.lon >= 0 ? 'E' : 'W'}`
    : 'None';

  const easeCurve: [number, number, number, number] = [0.22, 1, 0.36, 1];

  return (
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-black text-white font-sans select-none">
      {/* Background Atmosphere: Drifting Aurora Glows + Faint Film Grain */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full aurora-glow-1" />
        <div className="absolute -bottom-32 -right-32 w-[650px] h-[650px] rounded-full aurora-glow-2" />
        <div className="absolute inset-0 film-grain" />
      </div>

      {/* Slim Top Bar */}
      <motion.header
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeCurve, delay: 0 }}
        className="relative z-10 h-12 min-h-[48px] px-4 sm:px-6 flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] backdrop-blur-xl select-none"
      >
        <div className="flex items-center gap-3">
          <span className="font-display font-medium text-xs sm:text-sm tracking-tight text-white">
            Earth Information Jukebox
          </span>
          <span className="text-white/30 text-xs">|</span>
          <span className="text-xs font-mono text-white/70 truncate max-w-[200px] sm:max-w-none">
            {trackTitle}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex items-center gap-2 font-mono text-white/60">
            <span className="uppercase text-[11px] tracking-[0.12em] text-white/40">Status:</span>
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isPlaying
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                  : 'bg-white/30'
              }`}
            />
            <span className="text-white/80">{isPlaying ? 'Active' : 'Paused'}</span>
            {isMuted && <span className="text-amber-400 font-semibold">[Muted]</span>}
          </div>

          <motion.button
            type="button"
            onClick={onOpenHelp}
            whileHover={reducedMotion ? {} : { scale: 1.02 }}
            whileTap={reducedMotion ? {} : { scale: 0.98 }}
            aria-label="Open keyboard shortcuts help dialog"
            className="px-3 py-1 rounded-xl text-xs font-mono font-medium border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          >
            Help (?)
          </motion.button>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col min-[900px]:flex-row overflow-hidden p-2.5 sm:p-4 gap-3 min-[900px]:gap-4">
        {/* Globe Visualization Area (Desktop Left 62%, Stacks on Top under 900px) */}
        <motion.section
          aria-label="3D Globe Visualization"
          initial={
            reducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: isEntering ? 1.15 : 1, y: isEntering ? 0 : 12 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            duration: isEntering ? 0.9 : 0.6,
            ease: easeCurve,
            delay: reducedMotion ? 0 : 0.05,
          }}
          className="relative w-full min-[900px]:w-[62%] flex-1 flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden p-1 sm:p-2 shadow-2xl"
        >
          <div className="flex-1 w-full h-full min-h-[280px]">
            <Globe />
          </div>
          <InspectPanel />
        </motion.section>

        {/* Right Column Controls (Desktop Right 38%, Stacks Below under 900px) */}
        <section
          aria-label="Jukebox Controls and Legend"
          className="w-full min-[900px]:w-[38%] flex flex-col gap-3 min-[900px]:gap-4 overflow-y-auto"
        >
          {/* Deck Panel on Top */}
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeCurve, delay: reducedMotion ? 0 : 0.12 }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5 shadow-2xl"
          >
            <Deck />
          </motion.div>

          {/* Legend Panel Below */}
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeCurve, delay: reducedMotion ? 0 : 0.18 }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5 flex-1 shadow-2xl"
          >
            <Legend />
          </motion.div>
        </section>
      </main>

      {/* Bottom Status Bar */}
      <motion.footer
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeCurve, delay: reducedMotion ? 0 : 0.24 }}
        className="relative z-10 h-10 min-h-[40px] px-4 sm:px-6 flex items-center justify-between border-t border-white/[0.08] bg-white/[0.03] backdrop-blur-xl text-xs font-mono select-none"
      >
        <div className="flex items-center gap-6 overflow-hidden text-white/70">
          <div className="truncate">
            <span className="uppercase text-[10px] tracking-[0.12em] text-white/40 mr-1.5">TRACK:</span>
            <span className="text-white font-medium">{trackTitle}</span>
          </div>
          <div>
            <span className="uppercase text-[10px] tracking-[0.12em] text-white/40 mr-1.5">YEAR:</span>
            <span className="text-white/90">{currentYear}</span>
          </div>
          <div>
            <span className="uppercase text-[10px] tracking-[0.12em] text-white/40 mr-1.5">MODE:</span>
            <span className="uppercase font-semibold text-accent-blue">{mode}</span>
          </div>
        </div>

        <div className="flex items-center text-white/70">
          <span className="uppercase text-[10px] tracking-[0.12em] text-white/40 mr-1.5">CURSOR:</span>
          <span className="text-white/90">{cursorFormatted}</span>
        </div>
      </motion.footer>
    </div>
  );
};

export default Layout;
