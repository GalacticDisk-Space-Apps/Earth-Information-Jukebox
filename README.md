# Earth Information Jukebox

A web-based interactive jukebox that pairs NASA Earth Information Center visualizations with real-time dynamic sonifications generated from decoded physical data values.

[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/) [![three.js](https://img.shields.io/badge/three.js-000000?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org/) [![Tone.js](https://img.shields.io/badge/Tone.js-24292E?style=flat-square&logo=webaudio&logoColor=white)](https://tonejs.github.io/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/) [![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/) [![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com/) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

[Live Demo](<DEPLOYED_URL>) | [Demo Video](<VIDEO_URL>) | [Space Apps Project Page](<PROJECT_URL>)

## Demo

![Earth Information Jukebox hero interface showing interactive 3D globe with sea surface temperature layer and active longitudinal scan line](docs/assets/hero.png)

<!--
Media capture instructions for the team:
- docs/assets/hero.png: Capture desktop interface showing the 3D globe with GHRSST sea surface temperature, the active scan-line over the Pacific Ocean, and the deck transport controls.
- docs/assets/sweep.png: Capture Sweep Mode in action, showing the scan-line traversing west to east with active polyphonic voice activity.
- docs/assets/timelapse.png: Capture Time-lapse Mode with the year slider cycling through 2004-2024 and the trend chart visible.
- docs/assets/touch.png: Capture Touch Mode with a mouse hover or keyboard focus reticle over a specific coordinate, displaying numeric readout and reference tone prompt.
- docs/assets/demo.gif: Record a 15-second screen capture demonstrating audio activation, track selection, sweep playback, and touch probing.
-->

| Sweep Mode | Time-lapse Mode | Touch Mode |
| --- | --- | --- |
| ![Sweep Mode sonifying longitudinal scan line](docs/assets/sweep.png) | ![Time-lapse Mode advancing through years 2004-2024](docs/assets/timelapse.png) | ![Touch Mode probing coordinate values](docs/assets/touch.png) |
| West-to-east scan-line sonifying real-time data columns | Annual step progression tracking changes from 2004 to 2024 | Point inspection via pointer or keyboard navigation |

![Earth Information Jukebox feature demonstration workflow](docs/assets/demo.gif)

## Table of Contents

- [The Challenge](#the-challenge)
- [Our Approach](#our-approach)
- [Features](#features)
- [How It Works](#how-it-works)
  - [Data Pipeline](#data-pipeline)
  - [Sonification Design](#sonification-design)
  - [Runtime Execution](#runtime-execution)
  - [Application State](#application-state)
- [Tracks](#tracks)
- [Architecture](#architecture)
- [Accessibility](#accessibility)
- [Getting Started](#getting-started)
- [Project Workflow](#project-workflow)
- [Hackathon Timeline](#hackathon-timeline)
- [Deployment](#deployment)
- [Team](#team)
- [NASA Data and References](#nasa-data-and-references)
- [AI Tools Used](#ai-tools-used)
- [Limitations and Future Work](#limitations-and-future-work)
- [License and Acknowledgements](#license-and-acknowledgements)

## The Challenge

NASA's Earth Information Center (EIC) generates visual representations of planetary systems, tracking shifts in oceans, vegetation, ice cover, and wildfire activity. However, visual interfaces alone restrict access for individuals who are blind, visually impaired, or neurodivergent. The NASA Space Apps Challenge 2026 challenge ["The Earth Information Jukebox"](<CHALLENGE_URL>) calls for solutions that integrate EIC visualization frames with dynamic, real-time sonifications. The objective is to make Earth science accessible through structured, multi-sensory data interaction.

## Our Approach

Earth Information Jukebox is a client-side browser application structured like a physical jukebox. Each selectable track corresponds to a validated NASA Earth observation dataset. An interactive 3D globe renders the geospatial layer while a vertical scan line moves from west to east, converting decoded numerical data values under the needle into audio synthesis events.

A core technical requirement of this project is scientific fidelity. Audio parameters derive strictly from physical measurements (degrees Celsius, vegetation index ratios, percentage ice coverage) rather than display pixel brightness. The system reverses NASA Global Imagery Browse Services (GIBS) colormap palettes into floating-point numerical matrices, ensuring that what the user hears directly reflects physical Earth observations.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Inter, Arial','lineColor':'#5B6577','primaryTextColor':'#1B2333'}}}%%
flowchart LR
    classDef data fill:#F2A516,stroke:#C2800D,color:#FFFFFF;
    classDef state fill:#1E5BD8,stroke:#143FA0,color:#FFFFFF;
    classDef globe fill:#0E9F8A,stroke:#096E5F,color:#FFFFFF;
    classDef audio fill:#7A4FD1,stroke:#58359B,color:#FFFFFF;
    classDef ui fill:#D9387A,stroke:#A12458,color:#FFFFFF;
    classDef nasa fill:#0B1D3A,stroke:#050D1A,color:#FFFFFF;
    classDef neutral fill:#5B6577,stroke:#3D4450,color:#FFFFFF;

    subgraph OfflinePrep["Offline Data Prep"]
        SRC["NASA GIBS / EIC / SVS"]:::nasa
        PY["Python Prep (Fetch and Decode)"]:::data
    end

    subgraph StaticAssets["Static Assets"]
        PUB["public/data (Frames PNG, Values JSON, Meta JSON)"]:::data
    end

    subgraph BrowserRuntime["Browser Runtime"]
        LOAD["loadTrack Module"]:::state
        STORE["Zustand Store"]:::state
        GLOBE["Globe (R3F)"]:::globe
        AUDIO["Sonification Engine (Tone.js)"]:::audio
        UI["UI and A11y"]:::ui
    end

    SRC --> PY
    PY --> PUB
    PUB --> LOAD
    LOAD --> STORE
    STORE --> GLOBE
    STORE --> AUDIO
    STORE --> UI
```
Figure 1: System architecture showing offline data preparation, static deployment assets, and browser runtime modules.

## Features

### Listening Modes
- Sweep Mode: A vertical scan-line traverses from west (-180 deg) to east (+180 deg) across the globe, sonifying data columns into spatial audio chords.
- Time-lapse Mode: Automatically steps through annual frames from 2004 to 2024, running one complete longitudinal sweep per year to convey temporal trends.
- Touch Mode: Direct spatial interrogation enabling users to hover or focus on specific geographic coordinates via pointer or keyboard to hear exact values and reference comparisons.

### Data
- Colormap Inversion: Decodes RGB display pixels back into physical measurements (degrees Celsius, NDVI index, sea ice percentage).
- Downsampled Matrices: Processes 1440x720 satellite imagery into 180x90 discrete floating-point numerical grids (2-degree spatial resolution).
- Trend Summaries: Calculates global and longitudinal mean averages per frame to drive baseline deviation audio filters.
- Curated NASA Catalog: Includes sea surface temperature, vegetation index, sea ice concentration, and thermal anomaly records.

### Accessibility
- Keyboard First: Full keyboard control for transport, track selection, coordinate exploration, and audio muting.
- Screen Reader Support: Real-time status updates and value readouts dispatched through ARIA live regions.
- Audio Captions: Synchronized on-screen text describing acoustic pitch, active instruments, and data values.
- WCAG AA Contrast: UI components and text meet WCAG 2.1 AA contrast thresholds.
- Reduced Motion: Respects the `prefers-reduced-motion` system setting by disabling camera rotations and easing scan-line transitions.
- Reference Tones: Audio legend buttons allowing users to play calibration tones corresponding to minimum, baseline, and maximum values.

## How It Works

### Data Pipeline

NASA GIBS serves map tiles styled with specific scientific color lookup tables (LUTs). The data preparation pipeline ingests full-resolution equirectangular raster frames and reconstructs the underlying scalar fields using published colormap specifications.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Inter, Arial','lineColor':'#5B6577','primaryTextColor':'#1B2333'}}}%%
flowchart TB
    classDef data fill:#F2A516,stroke:#C2800D,color:#FFFFFF;
    classDef state fill:#1E5BD8,stroke:#143FA0,color:#FFFFFF;
    classDef globe fill:#0E9F8A,stroke:#096E5F,color:#FFFFFF;
    classDef audio fill:#7A4FD1,stroke:#58359B,color:#FFFFFF;
    classDef ui fill:#D9387A,stroke:#A12458,color:#FFFFFF;
    classDef nasa fill:#0B1D3A,stroke:#050D1A,color:#FFFFFF;
    classDef neutral fill:#5B6577,stroke:#3D4450,color:#FFFFFF;

    WMS["GIBS WMS GetMap Request"]:::nasa
    PNG["Equirectangular PNG (1440x720)"]:::data
    DOWN["Downsample (180x90)"]:::data
    LUT["Nearest-Colormap Lookup"]:::neutral
    CHK{"Value Check"}:::state
    VAL["Physical Value or Null (No Data)"]:::data
    OUT["values/date.json"]:::data
    TRD["trend.json (Global Mean per Frame)"]:::data

    WMS --> PNG
    PNG --> DOWN
    DOWN --> LUT
    LUT --> CHK
    CHK -->|"Decoded"| VAL
    VAL --> OUT
    VAL -->|"Aggregate"| TRD
```
Figure 2: Data pipeline converting GIBS raster imagery into downsampled numerical grids and annual trend summaries.

1. Fetch: An automated Python script executes WMS GetMap requests to GIBS for equirectangular projections (1440x720 pixels) matching exact historical dates (2004 to 2024).
2. Downsample: Images are downsampled to a 180x90 matrix using area-averaging interpolation to create a 2-degree longitude and latitude grid.
3. Colormap Lookup: For each pixel, an exact nearest-neighbor search matches the RGB triplet against the official GIBS XML colormap definition.
4. Numerical Output: Matched entries yield physical values with units (deg C, NDVI, % concentration). Missing data, masked land, or cloud fills resolve to null.
5. Export: Data exports as lightweight static JSON arrays (`values/<date>.json`), alongside precalculated global and longitudinal means (`trend.json`).

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Inter, Arial','lineColor':'#5B6577','primaryTextColor':'#1B2333'}}}%%
flowchart LR
    classDef data fill:#F2A516,stroke:#C2800D,color:#FFFFFF;
    classDef state fill:#1E5BD8,stroke:#143FA0,color:#FFFFFF;
    classDef globe fill:#0E9F8A,stroke:#096E5F,color:#FFFFFF;
    classDef audio fill:#7A4FD1,stroke:#58359B,color:#FFFFFF;
    classDef ui fill:#D9387A,stroke:#A12458,color:#FFFFFF;
    classDef nasa fill:#0B1D3A,stroke:#050D1A,color:#FFFFFF;
    classDef neutral fill:#5B6577,stroke:#3D4450,color:#FFFFFF;

    RGB["Pixel RGB"]:::globe
    TBL["Colormap Table"]:::neutral
    VAL["Physical Value with Unit"]:::data
    NRM["Normalized 0 to 1"]:::state
    PRM["Sound Parameter"]:::audio

    RGB --> TBL
    TBL --> VAL
    VAL --> NRM
    NRM --> PRM
```
Figure 3: Colormap decoding detail translating raw pixel colors into normalized acoustic parameters.

### Sonification Design

The sonification engine translates spatial and temporal scientific measurements into sound using Tone.js and the Web Audio API.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Inter, Arial','lineColor':'#5B6577','primaryTextColor':'#1B2333'}}}%%
flowchart LR
    classDef data fill:#F2A516,stroke:#C2800D,color:#FFFFFF;
    classDef audio fill:#7A4FD1,stroke:#58359B,color:#FFFFFF;

    R1_IN["Value"]:::data --> R1_OUT["Pitch (Pentatonic, 3 Octaves)"]:::audio
    R2_IN["Longitude"]:::data --> R2_OUT["Stereo Pan (West Left, East Right)"]:::audio
    R3_IN["Latitude Bands"]:::data --> R3_OUT["Chord Voices"]:::audio
    R4_IN["Dataset"]:::data --> R4_OUT["Instrument (Pad, Pluck, Bell, Noise)"]:::audio
    R5_IN["Change vs Baseline"]:::data --> R5_OUT["Filter Brightness"]:::audio
    R6_IN["Null"]:::data --> R6_OUT["Rest"]:::audio
```
Figure 4: Sonification mapping rules translating physical Earth variables into multi-voice audio parameters.

| Data property | Sound parameter | Rationale |
| --- | --- | --- |
| Physical Value | Pitch (pentatonic scale, 3 octaves) | Constrains pitch to harmonious musical intervals, avoiding dissonance while distinguishing values. |
| Longitude (-180 to +180 deg) | Stereo Pan (left -1.0 to right +1.0) | Provides spatial orientation matching the needle's physical transit across the globe. |
| Latitude Bands (90N to 90S) | Chord Voices (polyphonic layers) | Slices the scan line into distinct latitude bands so polar and equatorial conditions sound concurrently. |
| Dataset Category | Instrument Timbre (pad, pluck, bell, noise) | Assigns distinct acoustic identities reflecting dataset nature (fluid ocean pads vs transient fires). |
| Change vs Baseline | Filter Cutoff Brightness | Shifts harmonic cutoff higher when values exceed historical baselines, highlighting warming anomalies. |
| Null / Void | Rest (silence) | Distinguishes absence of measurement or masked terrain (e.g., continents in ocean tracks) from zero values. |

### Runtime Execution

Audio generation synchronizes directly with three.js rendering and Tone.Transport scheduling.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI
    participant Store
    participant AudioEngine
    participant Globe
    participant DataLoader

    rect rgb(240, 244, 255)
    Note over User,DataLoader: Audio Initialization and Track Setup
    User->>UI: Click "Drop the needle"
    UI->>AudioEngine: Tone.start()
    AudioEngine-->>UI: AudioContext Active
    UI->>Store: selectTrack(trackId)
    Store->>DataLoader: load meta, frames, and grids
    DataLoader-->>Store: Asset payloads returned
    Store->>UI: Status Ready
    end

    rect rgb(245, 240, 255)
    Note over User,DataLoader: Playback Tick Loop
    User->>UI: Click Play
    UI->>Store: setPlaying(true)
    Store->>AudioEngine: Start Tone.Transport
    loop Transport Tick
        AudioEngine->>Store: Transport tick
        Store->>Store: Update playhead position
        Store->>Globe: Move scan-line
        Store->>AudioEngine: Send column values
        AudioEngine->>AudioEngine: Play column chord
    end
    end
```
Figure 5: Runtime sequence showing audio unlock, asset loading, and the synchronous playback tick loop.

### Application State

The user interface, 3D visualization, and audio engine derive state through a centralized Zustand store.

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> AudioUnlocked: Drop the needle
    AudioUnlocked --> Loading: Select track
    Loading --> Ready: Assets loaded
    Loading --> Error: Load failure
    Error --> Ready: Retry load
    
    Ready --> Playing: Play
    Playing --> Paused: Pause
    Paused --> Playing: Resume
    Playing --> Timelapse: Switch mode
    Timelapse --> Playing: Exit timelapse

    Ready --> Touch: Hover or focus location
    Playing --> Touch: Hover or focus location
    Paused --> Touch: Hover or focus location
    Timelapse --> Touch: Hover or focus location
    Touch --> Ready: Release touch
```
Figure 6: Finite state machine governing audio unlock, asset loading, playback modes, and interactive touch probing.

## Tracks

| Track | NASA dataset | GIBS layer id | Unit | Years | Instrument |
| --- | --- | --- | --- | --- | --- |
| Ocean Fever | GHRSST MUR Sea Surface Temperature | `GHRSST_Sea_Surface_Temperature_Mur` (placeholder) | deg C | 2004-2024 | Warm Synth Pad |
| Breathing Planet | MODIS Terra NDVI (Vegetation Index) | `MODIS_Terra_NDVI_Monthly` (placeholder) | Index (-0.2 to 1.0) | 2004-2024 | Acoustic Pluck |
| Melting Crown | Sea Ice Concentration | `Sea_Ice_Concentration_Daily` (placeholder) | % Concentration | 2004-2024 | Crystal Bell |
| Fire Season (stretch goal) | MODIS/VIIRS Thermal Anomalies | `MODIS_Thermal_Anomalies_All` (placeholder) | Count / MW | 2004-2024 | Granular Noise Percussion |

## Architecture

The system coordinates visualization, audio synthesis, and accessibility through a decoupled component tree and state model.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Inter, Arial','lineColor':'#5B6577','primaryTextColor':'#1B2333'}}}%%
flowchart TB
    classDef data fill:#F2A516,stroke:#C2800D,color:#FFFFFF;
    classDef state fill:#1E5BD8,stroke:#143FA0,color:#FFFFFF;
    classDef globe fill:#0E9F8A,stroke:#096E5F,color:#FFFFFF;
    classDef audio fill:#7A4FD1,stroke:#58359B,color:#FFFFFF;
    classDef ui fill:#D9387A,stroke:#A12458,color:#FFFFFF;
    classDef neutral fill:#5B6577,stroke:#3D4450,color:#FFFFFF;

    App["App"]:::state
    StartScreen["StartScreen"]:::ui
    Layout["Layout"]:::neutral
    Globe["Globe"]:::globe
    Deck["Deck"]:::ui
    Legend["Legend"]:::ui
    Captions["Captions (aria-live)"]:::ui
    AudioEngine["AudioEngine (non-visual)"]:::audio

    DataLayer["DataLayer"]:::globe
    ScanLine["ScanLine"]:::globe
    Picker["Picker"]:::globe

    TrackCard["TrackCard"]:::ui
    Transport["Transport"]:::ui
    ModeSwitch["ModeSwitch"]:::ui
    YearSlider["YearSlider"]:::ui

    ReferenceTones["ReferenceTones"]:::audio
    TrendChart["TrendChart"]:::data

    App --> StartScreen
    App --> Layout
    App --> AudioEngine

    Layout --> Globe
    Layout --> Deck
    Layout --> Legend
    Layout --> Captions

    Globe --> DataLayer
    Globe --> ScanLine
    Globe --> Picker

    Deck --> TrackCard
    Deck --> Transport
    Deck --> ModeSwitch
    Deck --> YearSlider

    Legend --> ReferenceTones
    Legend --> TrendChart
```
Figure 7: Component hierarchy showing visual elements, three.js canvas components, and the background audio engine.

```mermaid
classDiagram
    class TrackMeta {
        +string id
        +string title
        +string dataset
        +string source
        +string unit
        +float min
        +float max
        +List~string~ frames
        +string instrument
        +string story
    }

    class ValueGrid {
        +int w
        +int h
        +List~float~ values
    }

    class JukeboxState {
        +TrackMeta track
        +int frameIndex
        +bool playing
        +float playhead
        +Cursor cursor
        +string mode
    }

    class Cursor {
        +float lat
        +float lon
        +float value
    }

    JukeboxState o-- TrackMeta : references
    JukeboxState o-- Cursor : tracks
    TrackMeta "1" *-- "many" ValueGrid : contains
```
Figure 8: Core data schema specifying metadata structures, numerical matrices, and application state models.

### Directory Structure

```
earth-information-jukebox/
├── docs/
│   └── assets/                     # Hero visual, interface screenshots, and workflow animation
├── public/
│   ├── data/
│   │   └── <track-id>/             # Dataset asset bundles per track
│   │       ├── frames/             # Equirectangular display textures (1440x720 PNG)
│   │       ├── values/             # Calibrated numerical data grids (180x90 JSON)
│   │       ├── meta.json           # Track ranges, physical units, and colormap tables
│   │       └── trend.json          # Historical global annual averages (2004-2024)
│   └── textures/                   # Base globe landmask and topography normal textures
├── scripts/
│   ├── fetch_gibs.py               # Downloads WMS frames from NASA GIBS API
│   ├── decode_colormap.py          # Decodes RGB pixels to physical measurements
│   ├── generate_trends.py          # Computes longitudinal and annual means
│   └── requirements.txt            # Python dependencies (requests, Pillow, numpy)
├── src/
│   ├── app/                        # Application bootstrap, routing, and primary shell
│   ├── audio/                      # Tone.js synths, musical scale mappings, and transport sync
│   ├── data/                       # Asynchronous asset loaders and grid query functions
│   ├── globe/                      # Three.js / R3F sphere, scan-line mesh, and raycaster picker
│   ├── store/                      # Zustand central state store and action reducers
│   └── ui/                         # Deck transport controls, accessibility legend, and ARIA views
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Accessibility

```mermaid
journey
    title User Exploration Journey
    section Launch and Audio Unlock
      Open application: 5: Sighted User, Screen-Reader User
      Click Drop the Needle: 5: Sighted User, Screen-Reader User
    section Track Selection
      Browse NASA Earth tracks: 5: Sighted User, 5: Screen-Reader User
      Select sea surface temperature: 5: Sighted User, 5: Screen-Reader User
    section Global Playback
      Start scan-line sweep: 5: Sighted User, 5: Screen-Reader User
      Observe visual sweep and hear chords: 5: Sighted User, 5: Screen-Reader User
      Read live descriptive captions: 4: Sighted User, 5: Screen-Reader User
    section Coordinate Exploration
      Probe coordinate with pointer or keyboard: 5: Sighted User, 5: Screen-Reader User
      Inspect numeric value and reference tone: 5: Sighted User, 5: Screen-Reader User
```
Figure 9: User journey comparing sighted and screen-reader workflows across exploration phases.

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Inter, Arial','lineColor':'#5B6577','primaryTextColor':'#1B2333'}}}%%
flowchart LR
    classDef neutral fill:#5B6577,stroke:#3D4450,color:#FFFFFF;
    classDef state fill:#1E5BD8,stroke:#143FA0,color:#FFFFFF;
    classDef audio fill:#7A4FD1,stroke:#58359B,color:#FFFFFF;
    classDef ui fill:#D9387A,stroke:#A12458,color:#FFFFFF;

    subgraph Inputs["Input Modalities"]
        KBD["Keyboard"]:::neutral
        PTR["Pointer"]:::neutral
        SR["Screen Reader"]:::neutral
    end

    subgraph Store["State Layer"]
        ACT["Store Actions"]:::state
    end

    subgraph Outputs["Accessibility Outputs"]
        AUD["Audio Engine"]:::audio
        LIVE["aria-live Announcement"]:::ui
        CAP["Captions"]:::ui
    end

    KBD --> ACT
    PTR --> ACT
    SR --> ACT

    ACT --> AUD
    ACT --> LIVE
    ACT --> CAP
```
Figure 10: Input routing from diverse modalities into centralized state actions and coordinated accessible outputs.

### Keyboard Shortcuts

| Shortcut | Action | Description |
| --- | --- | --- |
| `Space` | Play / Pause | Starts or halts the west-to-east scan sweep |
| `Left` / `Right` | Move cursor longitude | Steps the inspection cursor westward or eastward across the grid |
| `Up` / `Down` | Change year | Decrements or increments the historical dataset year (2004 to 2024) |
| `1` - `4` | Select track | Directly switches active track (1: SST, 2: NDVI, 3: Sea Ice, 4: Fire) |
| `M` | Mute | Toggles master audio output on and off |
| `?` | Help | Displays keyboard navigation instructions and shortcuts |

### Accessible Interaction Standards
- Screen Reader Announcements: Dynamic status changes dispatch via `aria-live="polite"` regions. Mode updates, dataset switches, and transport stops are read aloud automatically.
- Audible Captions: An active captions panel converts the current sonification into natural language descriptions (e.g., "Pacific Ocean: Low-mid pitch cluster, temperature 22.4 deg C").
- Reduced Motion: System queries via `prefers-reduced-motion` disable camera rotation animations and replace continuous needle motion with discrete interval updates.
- Reference Tones: Audio legend buttons allow users to hear calibration pitches corresponding to min, median, and max values, enabling accurate pitch-to-value interpretation without sight.
- Color Contrast: All UI elements meet WCAG 2.1 AA standards, maintaining contrast ratios of at least 4.5:1 for normal text and 3:1 for graphical controls.

## Getting Started

### Prerequisites
- Node.js 20.0 or higher
- npm 9.0 or higher
- Python 3.10 or higher (required for offline data regeneration)

### Installation
1. Clone the repository:
   ```bash
   git clone <REPO_URL>
   cd earth-information-jukebox
   ```
2. Install frontend JavaScript dependencies:
   ```bash
   npm install
   ```
3. Install Python dependencies for data preprocessing:
   ```bash
   pip install -r scripts/requirements.txt
   ```

### Running Locally
Start the Vite local development server:
```bash
npm run dev
```
Open `http://localhost:5173` in a modern browser supporting the Web Audio API.

### Data Regeneration
To fetch fresh frames directly from NASA GIBS and rebuild decoded value matrices:
```bash
# Fetch raw GIBS equirectangular images for Sea Surface Temperature
python scripts/fetch_gibs.py --track sst

# Decode pixel colors into physical floating-point matrices
python scripts/decode_colormap.py --track sst
```

### Production Build
Compile TypeScript and bundle production assets:
```bash
npm run build
```
Preview the production build locally:
```bash
npm run preview
```

## Project Workflow

```mermaid
gitGraph
    commit id: "Initial repository setup"
    branch feat/globe
    branch feat/data
    branch feat/audio
    branch feat/ui-a11y
    checkout feat/data
    commit id: "GIBS fetch script"
    commit id: "Colormap decoder"
    checkout main
    merge feat/data id: "Merge data pipeline"
    checkout feat/audio
    commit id: "Tone.js setup"
    commit id: "Scale mapping"
    checkout main
    merge feat/audio id: "Merge audio engine"
    checkout feat/globe
    commit id: "R3F globe sphere"
    commit id: "Scan line shader"
    checkout main
    merge feat/globe id: "Merge 3D globe"
    checkout feat/ui-a11y
    commit id: "Deck controls"
    commit id: "ARIA live regions"
    checkout main
    merge feat/ui-a11y id: "Merge UI and a11y"
    commit id: "Release preparation"
```
Figure 11: Git branching and integration workflow across core engineering submodules.

### Branch and PR Rules
- Branch Naming: All development occurs on isolated branches prefixed with `feat/`, `fix/`, or `docs/`.
- Pull Requests: Branches merge into `main` strictly through pull requests. Each pull request requires verification of type checking (`npm run type-check`) and production build passing (`npm run build`).
- Merge Strategy: Pull requests are squash-merged into `main` to maintain a readable linear history.
- Commit Conventions: Commits follow the Conventional Commits specification:
  - `feat:` New user-facing or runtime capabilities
  - `fix:` Bug fixes or data alignment corrections
  - `docs:` Documentation and architecture diagrams
  - `refactor:` Code improvements without functional modifications
  - `chore:` Dependency and build configuration updates

## Hackathon Timeline

```mermaid
gantt
    title Hackathon Project Schedule
    dateFormat YYYY-MM-DD HH:mm
    axisFormat %H:%M
    section Development
    Setup                      :a1, 2026-11-14 14:00, 2026-11-14 17:00
    Core features              :a2, 2026-11-14 17:00, 2026-11-15 01:00
    Integration                :a3, 2026-11-15 01:00, 2026-11-15 04:00
    section Rest
    Sleep                      :a4, 2026-11-15 04:00, 2026-11-15 08:30
    section Finalization
    Polish                     :a5, 2026-11-15 08:30, 2026-11-15 14:00
    Feature freeze             :milestone, m1, 2026-11-15 14:00, 0m
    Video                      :a6, 2026-11-15 14:00, 2026-11-15 17:30
    Submission                 :milestone, m2, 2026-11-15 19:00, 0m
```
Figure 12: Hackathon development timeline and milestones.

## Deployment

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Inter, Arial','lineColor':'#5B6577','primaryTextColor':'#1B2333'}}}%%
flowchart LR
    classDef neutral fill:#5B6577,stroke:#3D4450,color:#FFFFFF;
    classDef state fill:#1E5BD8,stroke:#143FA0,color:#FFFFFF;
    classDef globe fill:#0E9F8A,stroke:#096E5F,color:#FFFFFF;
    classDef ui fill:#D9387A,stroke:#A12458,color:#FFFFFF;

    PUSH["Push to Feature Branch"]:::neutral
    PR["Pull Request"]:::neutral
    CI["CI Build Check"]:::state
    MERGE["Merge to Main"]:::neutral
    BLD["Vercel Production Build"]:::globe
    URL["Production Deployment (<DEPLOYED_URL>)"]:::ui

    PUSH --> PR
    PR --> CI
    CI --> MERGE
    MERGE --> BLD
    BLD --> URL
```
Figure 13: Continuous deployment pipeline from branch pull request to Vercel production build.

The application compiles to a static client bundle and deploys through Vercel. Static JSON grids and texture maps are served with aggressive immutable cache headers (`Cache-Control: public, max-age=31536000, immutable`), ensuring zero latency during track transitions and playback scrubbing.

## Team

| Name | Role | Area of the codebase |
| --- | --- | --- |
| Aditya | Team Lead, Integration, App Shell, Deployment | `src/app`, `src/store`, build system, and hosting configuration |
| Aarav | 3D Globe Specialist | `src/globe`, Three.js shaders, scan-line visualization, and camera controls |
| Avidan | NASA Data Pipeline Engineer | `scripts/`, `src/data`, GIBS API fetching, and colormap decoding |
| Swanand | Sonification Engine Developer | `src/audio`, Tone.js audio graph, scale quantizer, and synthesizer patches |
| Neil | UX, Accessibility, Video, and Documentation Lead | `src/ui`, ARIA implementation, accessible captions, documentation, and demo video |

## NASA Data and References

| Dataset | Provider | Link | Usage |
| --- | --- | --- | --- |
| NASA GIBS (Global Imagery Browse Services) | NASA EOSDIS | https://gibs.earthdata.nasa.gov | WMS raster imagery tiles and published colormaps |
| NASA Worldview | NASA EOSDIS | https://worldview.earthdata.nasa.gov | Interactive reference visualization and layer verification |
| NASA Earth Information Center (EIC) | NASA | https://earth.gov | Curated Earth indicator narratives and scientific context |
| NASA Scientific Visualization Studio (SVS) | NASA Goddard Space Flight Center | https://svs.gsfc.nasa.gov | Climate visualization frames and comparative animation references |
| NASA Visible Earth (Blue Marble) | NASA | https://visibleearth.nasa.gov | Base land cover, topography, and ocean bathymetry textures |
| GHRSST MUR Sea Surface Temperature | NASA JPL / PO.DAAC | https://gibs.earthdata.nasa.gov (<TODO: add link>) | Sea surface temperature frames and colormap palette |
| MODIS Terra NDVI | NASA LP DAAC | https://gibs.earthdata.nasa.gov (<TODO: add link>) | Global vegetation index frames and colormap table |
| Sea Ice Concentration | NASA NSIDC DAAC | https://gibs.earthdata.nasa.gov (<TODO: add link>) | Arctic and Antarctic sea ice concentration layers |
| MODIS / VIIRS Thermal Anomalies | NASA FIRMS / LANCE | https://gibs.earthdata.nasa.gov (<TODO: add link>) | Active fire hotspot locations and radiative power (stretch goal) |

### Libraries
- [three.js](https://threejs.org/) - WebGL 3D graphics rendering engine
- [React Three Fiber](https://r3f.docs.pmnd.rs/) - Declarative React renderer for three.js
- [drei](https://github.com/pmndrs/drei) - Helper abstractions and camera utilities for React Three Fiber
- [Tone.js](https://tonejs.github.io/) - Web Audio framework for interactive music synthesis and scheduling
- [Zustand](https://zustand.docs.pmnd.rs/) - Small, fast state management for React
- [Vite](https://vitejs.dev/) - Next-generation frontend tooling and bundler
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework for interface styling

## AI Tools Used

Antigravity was used during the hackathon for code scaffolding, boilerplate generation, and initial documentation drafting. All generated code, data processing scripts, audio synthesis mappings, and architectural components were reviewed, modified, integrated, and tested directly by the team.

## Limitations and Future Work

- EIC Kiosk Mode: Physical installation profile designed for museum and gallery kiosks featuring external arcade knob/fader controller mapping via WebHID or Web MIDI.
- Additional Datasets: Ingestion of atmospheric greenhouse gas concentrations (OCO-2 carbon dioxide, EMIT methane plumes) and ocean salinity metrics.
- Haptic Feedback: Integration with the Web Vibration API and gamepad rumble motors to provide tactile low-frequency resonance alongside audio playback.
- Multi-Track Comparison Mode: Dual-needle playback routing two simultaneous datasets to discrete left and right stereo channels (for instance, sea surface temperature against sea ice concentration).
- Localization: Multilingual caption translation and internationalized screen-reader pronunciation dictionaries.

## License and Acknowledgements

This project is licensed under the MIT License - see the `LICENSE` file for details.

This project was built for the NASA Space Apps Challenge 2026. This project is an independent open-source submission and is not certified, sponsored, or endorsed by NASA. NASA logos and official insignias are not used in this repository.
