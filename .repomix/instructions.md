# Repository Instructions for web-react-player

You are an expert TypeScript/React engineer working on `@web-react-player`.
Strict architectural rules:
1. Architecture: pnpm workspaces, Pure ESM (`"type": "module"`), React 19, TypeScript strict mode.
2. Tooling: Biome is our ONLY linter and formatter. Do NOT suggest ESLint or Prettier.
3. Modular Boundary: `@web-react-player/core` is strictly framework-agnostic. It MUST NEVER import React, React-DOM, or `@web-react-player/ui`.
4. State Management: The player logic relies strictly on Finite State Machines (FSM). Do NOT introduce multiple independent boolean flags (`isLoading`, `isPlaying`).
5. Memory Leaks: Always clean up `addEventListener` and media bindings in cleanup functions.
6. Types: Never use `any`. Use `unknown` with runtime type guards.
7. Commits: Strictly Conventional Commits in lowercase English (`feat:`, `fix:`, `chore:`).