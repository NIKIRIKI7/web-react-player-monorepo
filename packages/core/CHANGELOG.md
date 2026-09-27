# @web-react-player/core

## 1.0.2

### Patch Changes

- docs: добавить в README пакетов разделы об архитектуре и DX — Widget-Driven Architecture, Virtual Environment & Sandboxing, Declarative Audio, Gestures & Smart UX, единый источник правды.

## 1.0.1

### Patch Changes

- Document the public API with TSDoc: every exported type, interface member, class field, method and function now has a Russian description and a runnable usage example, and all three entry points carry `@packageDocumentation`. `createDefaultRemotionSuite` moved to its own module so the bundled declarations keep the package doc comment, and the new `ParsedKeyChord` type is exported for `ResolvedBinding.chord`

## 1.0.0

### Major Changes

- 8e4c6e7: Fix race condition where the player got stuck in `loading` by accepting `CAN_PLAY` as a readiness signal, add `RATE_CHANGE` event for playback rate synchronization and replace the `SEEK_FRAME` event with frame computation derived from `TIME_UPDATE`

### Minor Changes

- 606c924: Add chapters, captions, fullscreen, PiP and theater support to the FSM, plus headless UI primitives (ActionBezel, Captions, FullscreenButton, PIPButton, ScreenGestures) and container-based responsive sizing (isSmall, smallWhenWidth) with adaptive captions and compact control bar
- 866cce6: Add marker segments with a context-aware skip pill, smart autopause via visibility and intersection listeners, persistence of volume and playback rate through hydration, ambient glow rendered behind the player, a Document Picture-in-Picture portal that moves the whole player with a return placeholder, and an audio boost path that drives the volume range 0–300% through a `GainNode` with the video element unmuted
- e62e857: Add per-video quality selection (VideoQuality, SET_QUALITIES/QUALITY_CHANGE/LOAD.qualities, seamless source swap via `actions.setQuality`) and adaptive responsive tiers (ContainerTier, `getContainerTier`, `tier` in PlayerContext) with a unified SettingsMenu consolidating quality, speed, ambient, document PiP and caption styles, plus an adaptive compact Skip pill for narrow containers

### Patch Changes

- 7724e6a: Add Remotion media provider, TSX compiler, web export engine, and native video provider composition
- c1d9899: Stabilize PlayerProvider: only notify listeners when snapshot actually changed, keep `send` reference stable and avoid re-subscribing keyboard shortcuts on every time update
