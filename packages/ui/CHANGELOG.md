# @web-react-player/ui

## 1.0.0

### Major Changes

- 7724e6a: Add Remotion media provider, TSX compiler, web export engine, and native video provider composition
- ec01e45: Add headless UI primitives: Root, PlayButton, MuteButton, TimeSlider and TimeDisplay
- 4c3c7c8: fix(ui): bug of Maximum update depth snapshot

### Minor Changes

- 606c924: Add chapters, captions, fullscreen, PiP and theater support to the FSM, plus headless UI primitives (ActionBezel, Captions, FullscreenButton, PIPButton, ScreenGestures) and container-based responsive sizing (isSmall, smallWhenWidth) with adaptive captions and compact control bar
- 866cce6: Add marker segments with a context-aware skip pill, smart autopause via visibility and intersection listeners, persistence of volume and playback rate through hydration, ambient glow rendered behind the player, a Document Picture-in-Picture portal that moves the whole player with a return placeholder, and an audio boost path that drives the volume range 0–300% through a `GainNode` with the video element unmuted
- 8e4c6e7: Fix race condition where the player got stuck in `loading` by accepting `CAN_PLAY` as a readiness signal, add `RATE_CHANGE` event for playback rate synchronization and replace the `SEEK_FRAME` event with frame computation derived from `TIME_UPDATE`
- e62e857: Add per-video quality selection (VideoQuality, SET_QUALITIES/QUALITY_CHANGE/LOAD.qualities, seamless source swap via `actions.setQuality`) and adaptive responsive tiers (ContainerTier, `getContainerTier`, `tier` in PlayerContext) with a unified SettingsMenu consolidating quality, speed, ambient, document PiP and caption styles, plus an adaptive compact Skip pill for narrow containers
- c2db2c7: Add declarative hotkeys via a `hotkeys` prop on Root (canonical commands like seek, volume, frame-step, skip-marker, plus user rebinds and macros, with editable-element suppression and `preventDefault` only on match) and a caption style customizer that applies persistent preferences through CSS variables on the root element without re-rendering the captions subtree

### Patch Changes

- c1d9899: Stabilize PlayerProvider: only notify listeners when snapshot actually changed, keep `send` reference stable and avoid re-subscribing keyboard shortcuts on every time update
- Updated dependencies [606c924]
- Updated dependencies [7724e6a]
- Updated dependencies [c1d9899]
- Updated dependencies [866cce6]
- Updated dependencies [8e4c6e7]
- Updated dependencies [e62e857]
  - @web-react-player/core@1.0.0
