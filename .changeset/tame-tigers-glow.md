---
"@web-react-player/core": major
"@web-react-player/ui": minor
---

Fix race condition where the player got stuck in `loading` by accepting `CAN_PLAY` as a readiness signal, add `RATE_CHANGE` event for playback rate synchronization and replace the `SEEK_FRAME` event with frame computation derived from `TIME_UPDATE`