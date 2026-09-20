// Re-export core types for convenience
export type { CaptionCue, Chapter, PlayerActionRecord } from '@web-react-player/core';

// Context

export type { PlayerContextValue, PlayerProviderProps } from './context/PlayerContext';
export { PlayerProvider, usePlayerContext } from './context/PlayerContext';
export type { ActionBezelProps } from './primitives/ActionBezel';
export { ActionBezel } from './primitives/ActionBezel';
export type { CaptionsProps } from './primitives/Captions';
export { Captions } from './primitives/Captions';
export type { FullscreenButtonProps } from './primitives/FullscreenButton';
export { FullscreenButton } from './primitives/FullscreenButton';
export type { MuteButtonProps } from './primitives/MuteButton';
export { MuteButton } from './primitives/MuteButton';
export type { PIPButtonProps } from './primitives/PIPButton';
export { PIPButton } from './primitives/PIPButton';
export type { PlayButtonProps } from './primitives/PlayButton';
export { PlayButton } from './primitives/PlayButton';
export type { RootProps } from './primitives/Root';
// Primitives
export { Root } from './primitives/Root';
export type { ScreenGesturesProps } from './primitives/ScreenGestures';
export { ScreenGestures } from './primitives/ScreenGestures';
export type { TimeDisplayProps } from './primitives/TimeDisplay';
export { TimeDisplay } from './primitives/TimeDisplay';
export type { TimeSliderProps } from './primitives/TimeSlider';
export { TimeSlider } from './primitives/TimeSlider';

// Utils
export { formatTime } from './utils/formatTime';

export const UI_PACKAGE_READY = true;
