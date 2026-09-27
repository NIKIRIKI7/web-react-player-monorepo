---
"@web-react-player/remotion": minor
---

Add declarative audio mixing: `audioMix` in the composition config (voiceover, music, sfx) with relative VFS asset paths, timeline placement, source trim points, fades and voice ducking, resolved by the compiler and rendered by the new `AudioMixerPlugin`

Add the dynamic widget engine: JSON widget bundles (`VidoraWidgetPackage` / `VidoraWidgetDefinition` / `VidoraWidgetProp`), a caching `WidgetRegistry` that compiles each `tsx_code` exactly once through the existing TSX compiler, `WidgetPropsEngine` for prop normalization and composition inference (16:9 / 9:16), and a new `RemotionSource` variant of `type: 'widget'` that plays and exports widgets without recompiling on prop updates
