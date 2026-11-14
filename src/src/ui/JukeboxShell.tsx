import React, { useState } from 'react';
import { StartScreen } from './StartScreen';
import { JukeboxDeck } from './JukeboxDeck';
import { MOCK_TRACKS } from './mockTracks';
import { JukeboxTrack, SonificationMode } from './types';

interface JukeboxShellProps {
  tracks?: JukeboxTrack[];
  onStartAudio?: () => Promise<void> | void;
  onPlayStateChange?: (playing: boolean) => void;
  onTrackChange?: (trackId: string) => void;
  onModeChange?: (mode: SonificationMode) => void;
  onVolumeChange?: (volume: number) => void;
  onSpeedChange?: (speed: number) => void;
  onReferenceTone?: () => void;
}

export const JukeboxShell: React.FC<JukeboxShellProps> = ({
  tracks = MOCK_TRACKS,
  onStartAudio,
  onPlayStateChange,
  onTrackChange,
  onModeChange,
  onVolumeChange,
  onSpeedChange,
  onReferenceTone,
}) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState(tracks[0]?.id ?? 'ocean-fever');
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<SonificationMode>('scientific');
  const [volume, setVolume] = useState(0.8);
  const [speed, setSpeed] = useState(1);

  const activeTrack =
    tracks.find((t) => t.id === selectedTrackId) ?? tracks[0] ?? MOCK_TRACKS[0];

  const handleSelectTrack = (id: string) => {
    setSelectedTrackId(id);
    onTrackChange?.(id);
  };

  const handleLaunch = async () => {
    await onStartAudio?.();
    setHasStarted(true);
    setIsPlaying(true);
    onPlayStateChange?.(true);
  };

  const handleTogglePlay = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    onPlayStateChange?.(next);
  };

  const handleModeChange = (nextMode: SonificationMode) => {
    setMode(nextMode);
    onModeChange?.(nextMode);
  };

  const handleVolumeChange = (nextVol: number) => {
    setVolume(nextVol);
    onVolumeChange?.(nextVol);
  };

  const handleSpeedChange = (nextSpeed: number) => {
    setSpeed(nextSpeed);
    onSpeedChange?.(nextSpeed);
  };

  return (
    <>
      {!hasStarted && (
        <StartScreen
          tracks={tracks}
          selectedTrackId={activeTrack.id}
          onSelectTrack={handleSelectTrack}
          onLaunch={handleLaunch}
        />
      )}

      <JukeboxDeck
        tracks={tracks}
        activeTrack={activeTrack}
        isPlaying={isPlaying}
        mode={mode}
        volume={volume}
        speed={speed}
        onSelectTrack={handleSelectTrack}
        onTogglePlay={handleTogglePlay}
        onChangeMode={handleModeChange}
        onChangeVolume={handleVolumeChange}
        onChangeSpeed={handleSpeedChange}
        onPlayReferenceTone={onReferenceTone}
      />
    </>
  );
};