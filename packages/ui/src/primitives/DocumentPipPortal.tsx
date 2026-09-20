import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePlayerContext, usePlayerState } from '../context/PlayerContext';

export interface DocumentPipPortalProps {
  children: ReactNode;
  width?: number;
  height?: number;
}

interface DocumentPictureInPictureApi {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
}

function getDocumentPipApi(): DocumentPictureInPictureApi | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const api = (window as unknown as { documentPictureInPicture?: DocumentPictureInPictureApi })
    .documentPictureInPicture;
  return api ?? null;
}

// Clones the <style>/<link> nodes themselves (not cssRules text) into the PiP
// window. Reading cssRules throws for cross-origin stylesheets and Vite dev
// mode serves styles as inline <style> tags, which cloneNode handles safely.
function copyStylesToPipWindow(pipWindow: Window) {
  const head = pipWindow.document.head;
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    head.appendChild(node.cloneNode(true));
  });
}

// The main layout rules do not reach the PiP window, so give the body the
// size of a full viewport; the portaled player then fills it correctly.
function stylePipBody(pipWindow: Window) {
  const body = pipWindow.document.body;
  body.style.margin = '0';
  body.style.padding = '0';
  body.style.background = '#000000';
  body.style.width = '100vw';
  body.style.height = '100vh';
  body.style.overflow = 'hidden';
  body.style.display = 'flex';
  body.style.alignItems = 'center';
  body.style.justifyContent = 'center';
}

// Moves the WHOLE player (video + overlays) into the Document Picture-in-Picture
// window when the "documentPip" context flag is enabled. The main window keeps a
// placeholder with a "Return to Page" button instead of the player.
export function DocumentPipPortal({ children, width = 720, height = 405 }: DocumentPipPortalProps) {
  const { actions, send } = usePlayerContext();
  const isActive = usePlayerState((s) => s.context.documentPip);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  useEffect(() => {
    if (!isActive) {
      setPipWindow(null);
      return;
    }
    let cancelled = false;
    let win: Window | null = null;

    const api = getDocumentPipApi();
    if (!api) {
      // Unsupported browser: reset the flag so the UI is not stuck in "on".
      console.warn('[web-react-player] Document Picture-in-Picture is not supported here.');
      actions.triggerAction('document_pip_error');
      send({ type: 'DOCUMENT_PIP_CHANGE', documentPip: false });
      return;
    }

    api
      .requestWindow({ width, height })
      .then((pipWin) => {
        if (cancelled) {
          pipWin.close();
          return;
        }
        win = pipWin;
        copyStylesToPipWindow(pipWin);
        stylePipBody(pipWin);
        pipWin.addEventListener('pagehide', () => {
          if (cancelled) return;
          setPipWindow(null);
          send({ type: 'DOCUMENT_PIP_CHANGE', documentPip: false });
          actions.triggerAction('document_pip_close');
        });
        setPipWindow(pipWin);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn('[web-react-player] failed to open Document PiP:', err);
        actions.triggerAction('document_pip_error');
        send({ type: 'DOCUMENT_PIP_CHANGE', documentPip: false });
      });

    return () => {
      cancelled = true;
      setPipWindow(null);
      win?.close();
    };
  }, [actions, height, isActive, send, width]);

  // Not (yet) in PiP: render the player normally in the main window.
  if (!isActive || !pipWindow) {
    return <>{children}</>;
  }

  // Player moved into the PiP window; leave a placeholder on the page.
  return (
    <>
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0a',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          gap: 12,
          border: '1px solid #262626',
        }}
      >
        <svg
          role="img"
          aria-label="Picture in picture"
          viewBox="0 0 24 24"
          width="44"
          height="44"
          fill="currentColor"
        >
          <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z" />
        </svg>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Playing in Picture-in-Picture window</span>
        <button
          type="button"
          onClick={() => {
            send({ type: 'DOCUMENT_PIP_CHANGE', documentPip: false });
            actions.triggerAction('document_pip_close');
          }}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Return to Page
        </button>
      </div>
      {createPortal(
        <div
          style={{
            width: '100vw',
            height: '100vh',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {children}
        </div>,
        pipWindow.document.body,
      )}
    </>
  );
}
