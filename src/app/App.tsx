import React, { useEffect } from 'react';
import { useJukebox } from '@/store/useJukebox';
import { makeFakeTrack } from '@/data/fake';
import { Globe } from '@/globe/Globe';
import { AudioEngine } from '@/audio/AudioEngine';
import { Deck } from '@/ui/Deck';
import { Legend } from '@/ui/Legend';
import { Captions } from '@/ui/Captions';
import { StartScreen } from '@/ui/StartScreen';

export const App: React.FC = () => {
  const setTracks = useJukebox((s) => s.setTracks);

  useEffect(() => {
    // Initialize default tracks
    const defaultTracks = [
      makeFakeTrack('ocean-fever'),
      makeFakeTrack('breathing-planet'),
      makeFakeTrack('melting-crown'),
      makeFakeTrack('fire-season'),
    ];
    setTracks(defaultTracks);
  }, [setTracks]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <StartScreen />
      <AudioEngine />

      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            Earth Information Jukebox
          </h1>
          <p className="text-xs text-slate-400">
            NASA Space Apps Challenge 2026 - Real-time Earth Data Sonification
          </p>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Vite + React + Three.js + Tone.js + Zustand
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl w-full mx-auto">
        <section className="lg:col-span-2 flex flex-col gap-6">
          <Globe />
          <Captions />
        </section>

        <section className="flex flex-col gap-6">
          <Deck />
          <Legend />
        </section>
      </main>
    </div>
  );
};

export default App;
