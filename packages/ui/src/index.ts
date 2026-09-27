/**
 * Headless React-слой видеоплеера Web React Player: контекст состояния,
 * набор UI-примитивов, раскладка, горячие клавиши и стилизация субтитров.
 *
 * Пакет не содержит готового дизайна: каждый примитив экспортируется
 * отдельно, поэтому их можно комбинировать как конструктор. Единственный
 * обязательный элемент — {@link PlayerProvider}, который поднимает конечный
 * автомат из `@web-react-player/core` и синхронизирует его с DOM.
 *
 * @packageDocumentation
 *
 * @example Минимальный плеер на нативном video-элементе
 * ```tsx
 * import { DefaultStandardLayout, Html5VideoProvider, PlayerProvider, Root } from '@web-react-player/ui';
 *
 * export function App() {
 *   return (
 *     <PlayerProvider>
 *       <div style={{ position: 'relative', aspectRatio: '16 / 9' }}>
 *         <Root>
 *           <Html5VideoProvider src="/media/movie.mp4" crossOrigin="anonymous" />
 *           <DefaultStandardLayout />
 *         </Root>
 *       </div>
 *     </PlayerProvider>
 *   );
 * }
 * ```
 *
 * @example Сборка собственного интерфейса из примитивов
 * ```tsx
 * import { usePlayerState, PlayerProvider, Root, PlayButton, TimeDisplay, TimeSlider } from '@web-react-player/ui';
 *
 * function MinimalControls() {
 *   const time = usePlayerState((s) => s.context.currentTime);
 *   return (
 *     <div>
 *       <TimeSlider />
 *       <TimeDisplay type="current" />
 *       <PlayButton />
 *       <span>{time.toFixed(1)}s</span>
 *     </div>
 *   );
 * }
 *
 * export function App() {
 *   return (
 *     <PlayerProvider>
 *       <Root>
 *         <MinimalControls />
 *       </Root>
 *     </PlayerProvider>
 *   );
 * }
 * ```
 *
 * @example Доступ к состоянию и императивным действиям
 * ```tsx
 * import { usePlayerContext } from '@web-react-player/ui';
 *
 * function JumpButton() {
 *   const { state, actions, isScrubbing, setIsScrubbing } = usePlayerContext();
 *   return (
 *     <button
 *       type="button"
 *       disabled={state.context.duration === 0}
 *       onPointerDown={() => setIsScrubbing(true)}
 *       onPointerUp={() => {
 *         setIsScrubbing(false);
 *         actions.seek(state.context.currentTime + 30);
 *       }}
 *     >
 *       +30 секунд
 *     </button>
 *   );
 * }
 * ```
 *
 * @example Переопределение горячих клавиш
 * ```tsx
 * import { PlayerProvider, Root, type HotkeysMap } from '@web-react-player/ui';
 *
 * const hotkeys: HotkeysMap = {
 *   'Shift+P': { handler: (ctx) => ctx.actions.togglePlay(), description: 'Пауза' },
 *   r: ['seekTo10', 'seekTo20'],
 *   togglePlay: 'Space',
 * };
 *
 * export function App() {
 *   return (
 *     <PlayerProvider>
 *       <Root hotkeys={hotkeys} keyboardShortcuts idleTimeout={3000} />
 *     </PlayerProvider>
 *   );
 * }
 * ```
 */

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
  WordCue,
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
  type ResolvedBinding,
} from './hotkeys/dispatcher';
// Hotkeys API
export type { ParsedKeyChord } from './hotkeys/normalizer';
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

/**
 * Флаг готовности пакета `@web-react-player/ui`.
 *
 * Константа экспортируется как ранний индикатор того, что бандл собран
 * корректно: она присутствует только в скомпилированном пакете и позволяет
 * smoke-тестам и feature-флагам проверить доступность модуля без лишней обвязки.
 *
 * @public
 * @example
 * ```ts
 * import { UI_PACKAGE_READY } from '@web-react-player/ui';
 *
 * if (UI_PACKAGE_READY) {
 *   console.log('UI-слой загружен');
 * }
 * ```
 */
export const UI_PACKAGE_READY = true;
