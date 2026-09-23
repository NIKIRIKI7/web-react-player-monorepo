// cspell:words Customizer
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
  VideoQuality,
} from '@web-react-player/core';

// Context

// Caption Customizer API
export type {
  CaptionFontFamily,
  CaptionStylePreferences,
  CaptionTextShadow,
} from './captions/types';
export { DEFAULT_CAPTION_STYLES } from './captions/types';
export {
  captionStylesToCssVariables,
  hexToRgba,
  loadCaptionPreferences,
  saveCaptionPreferences,
} from './captions/utils';
export type { PlayerContextValue, PlayerProviderProps } from './context/PlayerContext';
export {
  type ContainerTier,
  getContainerTier,
  PlayerProvider,
  usePlayerContext,
  usePlayerState,
} from './context/PlayerContext';
export { DEFAULT_HOTKEYS } from './hotkeys/defaultHotkeys';
export {
  compileHotkeyBindings,
  executeCanonicalCommand,
  handleKeyboardShortcut,
} from './hotkeys/dispatcher';
// Hotkeys API
export type {
  HotkeyAction,
  HotkeyBindingDescriptor,
  HotkeyHandler,
  HotkeysMap,
  PlayerCommand,
} from './hotkeys/types';
// Layouts
export type { DefaultStandardLayoutProps } from './layouts/DefaultStandardLayout';
export { DefaultStandardLayout } from './layouts/DefaultStandardLayout';
export type { ActionBezelProps } from './primitives/ActionBezel';
export { ActionBezel } from './primitives/ActionBezel';
export type { AmbientBackgroundProps } from './primitives/AmbientBackground';
export { AmbientBackground } from './primitives/AmbientBackground';
export type { CaptionCustomizerProps } from './primitives/CaptionCustomizer';
export { CaptionCustomizer, CaptionPreviewBox } from './primitives/CaptionCustomizer';
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
export type { MuteButtonProps } from './primitives/MuteButton';
export { MuteButton } from './primitives/MuteButton';
export type { PIPButtonProps } from './primitives/PIPButton';
export { PIPButton } from './primitives/PIPButton';
export type { PlayButtonProps } from './primitives/PlayButton';
export { PlayButton } from './primitives/PlayButton';
export type { PlayerDebugProps } from './primitives/PlayerDebug';
export { PlayerDebug } from './primitives/PlayerDebug';
export type { QualityMenuProps } from './primitives/QualityMenu';
export { QualityMenu } from './primitives/QualityMenu';
export type { RootProps } from './primitives/Root';
// Primitives
export { Root } from './primitives/Root';
export type { ScreenGesturesProps } from './primitives/ScreenGestures';
export { ScreenGestures } from './primitives/ScreenGestures';
export type { SettingsMenuProps } from './primitives/SettingsMenu';
export { SettingsMenu } from './primitives/SettingsMenu';
export type { TimeDisplayProps } from './primitives/TimeDisplay';
export { TimeDisplay } from './primitives/TimeDisplay';
export type { TimeSliderProps } from './primitives/TimeSlider';
export { TimeSlider } from './primitives/TimeSlider';
export type { VolumeControlProps } from './primitives/VolumeControl';
export { VolumeControl } from './primitives/VolumeControl';

// Providers
export type { Html5VideoProviderProps } from './providers/Html5VideoProvider';
export { Html5VideoProvider } from './providers/Html5VideoProvider';

// Utils
export { formatTime } from './utils/formatTime';
export type { SlotProps } from './utils/Slot';
export { Slot } from './utils/Slot';

export const UI_PACKAGE_READY = true;
