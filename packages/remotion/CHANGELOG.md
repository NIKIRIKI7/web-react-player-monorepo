# @web-react-player/remotion

## 0.2.0

### Minor Changes

- 9c880f1: Add declarative audio mixing: `audioMix` in the composition config (voiceover, music, sfx) with relative VFS asset paths, timeline placement, source trim points, fades and voice ducking, resolved by the compiler and rendered by the new `AudioMixerPlugin`
  
  Add the dynamic widget engine: JSON widget bundles (`VidoraWidgetPackage` / `VidoraWidgetDefinition` / `VidoraWidgetProp`), a caching `WidgetRegistry` that compiles each `tsx_code` exactly once through the existing TSX compiler, `WidgetPropsEngine` for prop normalization and composition inference (16:9 / 9:16), and a new `RemotionSource` variant of `type: 'widget'` that plays and exports widgets without recompiling on prop updates

## 0.1.0

### Minor Changes

- 7724e6a: Add Remotion media provider, TSX compiler, web export engine, and native video provider composition

### Patch Changes

- Updated dependencies [606c924]
- Updated dependencies [7724e6a]
- Updated dependencies [ec01e45]
- Updated dependencies [c1d9899]
- Updated dependencies [4c3c7c8]
- Updated dependencies [866cce6]
- Updated dependencies [8e4c6e7]
- Updated dependencies [e62e857]
- Updated dependencies [c2db2c7]
  - @web-react-player/ui@1.0.0
