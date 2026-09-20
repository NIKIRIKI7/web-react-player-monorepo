// Re-export core types for convenience
export type {
  CaptionCue,
  Chapter,
  Marker,
  PlayerActionRecord,
  PlayerEvent,
  PlayerMiddleware,
  PlayerSnapshot,
  PlayerStatus,
} from '@web-react-player/core';

// Context

export type { PlayerContextValue, PlayerProviderProps } from './context/PlayerContext';
export { PlayerProvider, usePlayerContext, usePlayerState } from './context/PlayerContext';
export type { ActionBezelProps } from './primitives/ActionBezel';
export { ActionBezel } from './primitives/ActionBezel';
export type { AmbientBackgroundProps } from './primitives/AmbientBackground';
export { AmbientBackground } from './primitives/AmbientBackground';
export type { CaptionsProps } from './primitives/Captions';
export { Captions } from './primitives/Captions';
export type { DocumentPipPortalProps } from './primitives/DocumentPipPortal';
export { DocumentPipPortal } from './primitives/DocumentPipPortal';
export type { FullscreenButtonProps } from './primitives/FullscreenButton';
export { FullscreenButton } from './primitives/FullscreenButton';
export type { InteractiveMarkersProps } from './primitives/InteractiveMarkers';
export { InteractiveMarkers } from './primitives/InteractiveMarkers';
export type { MatchMedia, MatchProps } from './primitives/Match';
export { Match } from './primitives/Match';
export type { MediaProviderProps } from './primitives/MediaProvider';
export { MediaProvider } from './primitives/MediaProvider';
export type { MuteButtonProps } from './primitives/MuteButton';
export { MuteButton } from './primitives/MuteButton';
export type { PIPButtonProps } from './primitives/PIPButton';
export { PIPButton } from './primitives/PIPButton';
export type { PlayButtonProps } from './primitives/PlayButton';
export { PlayButton } from './primitives/PlayButton';
export type { PlayerDebugProps } from './primitives/PlayerDebug';
export { PlayerDebug } from './primitives/PlayerDebug';
export type { RootProps } from './primitives/Root';
// Primitives
export { Root } from './primitives/Root';
export type { ScreenGesturesProps } from './primitives/ScreenGestures';
export { ScreenGestures } from './primitives/ScreenGestures';
export type { TimeDisplayProps } from './primitives/TimeDisplay';
export { TimeDisplay } from './primitives/TimeDisplay';
export type { TimeSliderProps } from './primitives/TimeSlider';
export { TimeSlider } from './primitives/TimeSlider';
export type { VolumeControlProps } from './primitives/VolumeControl';
export { VolumeControl } from './primitives/VolumeControl';

// Utils
export { formatTime } from './utils/formatTime';
export type { SlotProps } from './utils/Slot';
export { Slot } from './utils/Slot';

export const UI_PACKAGE_READY = true;
