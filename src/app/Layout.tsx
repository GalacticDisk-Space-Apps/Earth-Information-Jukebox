import React from 'react';
import {
  useActiveTrack,
  useFrameIndex,
  useMode,
  useCursor,
  useIsPlaying,
  useIsMuted,
} from '@/store/useJukebox';
import { Globe } from '@/globe/Globe';
import { Deck } from '@/ui/Deck';
import { Legend } from '@/ui/Legend';

interface LayoutProps {
  onOpenHelp?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ onOpenHelp }) => {
  const activeTrack = useActiveTrack();
  const frameIndex = useFrameIndex();
  const mode = useMode();
  const cursor = useCursor();
  const isPlaying = useIsPlaying();
  const isMuted = useIsMuted();

  const currentYear = activeTrack?.frames[frameIndex] ?? '2004';
  const trackTitle = activeTrack?.title ?? 'No Track Selected';

  const cursorFormatted = cursor
    ? `${Math.abs(cursor.lat).toFixed(1)}°${cursor.lat >= 0 ? 'N' : 'S'}, ${Math.abs(cursor.lon).toFixed(1)}°${cursor.lon >= 0 ? 'E' : 'W'}`
    : 'None';

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden text-slate-100 font-sans"
      style={{ backgroundColor: '#070B14' }}
    >
      {/* Slim Top Bar */}
      <header
        className="h-12 min-h-[48px] px-4 flex items-center justify-between border-b select-none"
        style={{
          backgroundColor: '#0F1626',
          borderColor: '#1E2A40',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm tracking-tight text-white">
            Earth Information Jukebox
          </span>
          <span className="text-xs text-slate-500">|</span>
          <span className="text-xs font-medium text-slate-300">
            {trackTitle}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex items-center gap-2 text-slate-400 font-mono">
            <span>Status:</span>
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: isPlaying ? '#0E9F8A' : '#5B6577' }}
            />
            <span className="text-slate-300">{isPlaying ? 'Active' : 'Paused'}</span>
            {isMuted && <span className="text-amber-400 font-semibold">[Muted]</span>}
          </div>

          <button
            type="button"
            onClick={onOpenHelp}
            aria-label="Open keyboard shortcuts help dialog"
            className="px-2.5 py-1 rounded text-xs font-mono font-medium border text-slate-300 hover:text-white transition-colors"
            style={{
              backgroundColor: '#070B14',
              borderColor: '#1E2A40',
            }}
          >
            Help (?)
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-[900px]:flex-row overflow-hidden p-2 gap-2 min-[900px]:p-4 min-[900px]:gap-4">
        {/* Globe Visualization Area (Desktop Left 62%, Stacks on Top under 900px) */}
        <section
          aria-label="3D Globe Visualization"
          className="w-full min-[900px]:w-[62%] flex-1 flex flex-col rounded-lg border overflow-hidden p-2 min-[900px]:p-4"
          style={{
            backgroundColor: '#0F1626',
            borderColor: '#1E2A40',
          }}
        >
          <div className="flex-1 w-full h-full min-h-[280px]">
            <Globe />
          </div>
        </section>

        {/* Right Column Controls (Desktop Right 38%, Stacks Below under 900px) */}
        <section
          aria-label="Jukebox Controls and Legend"
          className="w-full min-[900px]:w-[38%] flex flex-col gap-2 min-[900px]:gap-4 overflow-y-auto"
        >
          {/* Deck Panel on Top */}
          <div
            className="rounded-lg border p-2 min-[900px]:p-4"
            style={{
              backgroundColor: '#0F1626',
              borderColor: '#1E2A40',
            }}
          >
            <Deck />
          </div>

          {/* Legend Panel Below */}
          <div
            className="rounded-lg border p-2 min-[900px]:p-4 flex-1"
            style={{
              backgroundColor: '#0F1626',
              borderColor: '#1E2A40',
            }}
          >
            <Legend />
          </div>
        </section>
      </main>

      {/* Bottom Status Bar */}
      <footer
        className="h-10 min-h-[40px] px-4 flex items-center justify-between border-t text-xs font-mono select-none"
        style={{
          backgroundColor: '#0F1626',
          borderColor: '#1E2A40',
        }}
      >
        <div className="flex items-center gap-6 overflow-hidden text-slate-300">
          <div className="truncate">
            <span className="text-slate-500 mr-1.5">Track:</span>
            <span className="text-white font-medium">{trackTitle}</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1.5">Year:</span>
            <span className="text-slate-200">{currentYear}</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1.5">Mode:</span>
            <span className="uppercase font-semibold" style={{ color: '#1E5BD8' }}>
              {mode}
            </span>
          </div>
        </div>

        <div className="flex items-center text-slate-400">
          <span className="text-slate-500 mr-1.5">Cursor:</span>
          <span className="text-slate-200">{cursorFormatted}</span>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
