import React, { useEffect, useState } from 'react';
import { useStatus } from '@/store/useJukebox';
import { bootstrap } from '@/app/bootstrap';
import { Layout } from '@/app/Layout';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { HelpDialog } from '@/app/HelpDialog';
import { useKeyboard } from '@/app/useKeyboard';
import { StartScreen } from '@/ui/StartScreen';
import { AudioEngine } from '@/audio/AudioEngine';
import { Captions } from '@/ui/Captions';

export const App: React.FC = () => {
  const status = useStatus();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Wire global keyboard shortcuts
  useKeyboard({
    isHelpOpen,
    onToggleHelp: () => setIsHelpOpen((prev) => !prev),
    onCloseHelp: () => setIsHelpOpen(false),
  });

  // Initialize track catalogue and detect prefers-reduced-motion on start
  useEffect(() => {
    bootstrap({ setReady: false });
  }, []);

  return (
    <ErrorBoundary>
      {/* Headless AudioEngine is always mounted */}
      <AudioEngine />

      {/* Screen-reader accessible Captions live region is always mounted */}
      <Captions />

      {/* Primary view routing: StartScreen when idle, otherwise main Layout */}
      {status === 'idle' ? (
        <StartScreen />
      ) : (
        <Layout onOpenHelp={() => setIsHelpOpen(true)} />
      )}

      {/* Global accessible shortcuts modal */}
      <HelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </ErrorBoundary>
  );
};

export default App;
