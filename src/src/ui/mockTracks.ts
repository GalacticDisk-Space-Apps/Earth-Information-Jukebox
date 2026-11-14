export type Provenance = 'measured' | 'image-estimate' | 'creative';
export type SonificationMode = 'scientific' | 'creative';

export interface JukeboxTrack {
  id: string;
  title: string;
  subtitle: string;
  unit: string;
  rangeLabel: string;
  provenance: Provenance;
  description: string;
  credit: string;
  accentColor: string;
}

export interface JukeboxControlsState {
  isStarted: boolean;
  isPlaying: boolean;
  mode: SonificationMode;
  volume: number; // 0 to 1
  speed: number;  // 0.5, 1, 2
  activeTrackId: string;
}