---
"@web-react-player/core": patch
"@web-react-player/ui": patch
---

Stabilize PlayerProvider: only notify listeners when snapshot actually changed, keep `send` reference stable and avoid re-subscribing keyboard shortcuts on every time update