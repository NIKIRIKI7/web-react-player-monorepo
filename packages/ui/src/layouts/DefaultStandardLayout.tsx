import type { ComponentProps } from 'react';
import { usePlayerContext } from '../context/PlayerContext';
import { ActionBezel } from '../primitives/ActionBezel';
import { AmbientBackground } from '../primitives/AmbientBackground';
import { Captions } from '../primitives/Captions';
import { FullscreenButton } from '../primitives/FullscreenButton';
import { InteractiveMarkers } from '../primitives/InteractiveMarkers';
import { PlayButton } from '../primitives/PlayButton';
import { PlayerDebug } from '../primitives/PlayerDebug';
import { QualityMenu } from '../primitives/QualityMenu';
import { SettingsMenu } from '../primitives/SettingsMenu';
import { TimeDisplay } from '../primitives/TimeDisplay';
import { TimeSlider } from '../primitives/TimeSlider';
import { VolumeControl } from '../primitives/VolumeControl';

export interface DefaultStandardLayoutProps extends ComponentProps<'div'> {
  debug?: boolean;
}

// Pre-assembled "YouTube-like" layout. It composes the headless primitives into
// a ready-made bottom control bar with a gradient, auto-hiding while idle, so
// consumers get a familiar player UI without wiring the primitives by hand.
export function DefaultStandardLayout({
  debug = false,
  style,
  ...props
}: DefaultStandardLayoutProps) {
  const { controlsVisible } = usePlayerContext();

  return (
    <>
      {/* Overlay / presentation layers rendered behind the controls */}
      <AmbientBackground />
      <ActionBezel />
      <InteractiveMarkers />
      <Captions />
      {debug && <PlayerDebug enabled={true} />}

      {/* Bottom control bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '24px 16px 12px',
          background:
            'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          opacity: controlsVisible ? 1 : 0,
          visibility: controlsVisible ? 'visible' : 'hidden',
          transition: 'opacity 0.25s ease-in-out, visibility 0.25s ease-in-out',
          zIndex: 50,
          ...style,
        }}
        {...props}
      >
        <TimeSlider />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PlayButton />
            <VolumeControl />
            <TimeDisplay />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <QualityMenu />
            <SettingsMenu />
            <FullscreenButton />
          </div>
        </div>
      </div>
    </>
  );
}
