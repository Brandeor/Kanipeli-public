# Kaninkapina Architecture

Kaninkapina is moving from a single-file prototype toward a small game framework with a reusable engine layer and replaceable game/content layers.

## Layout

```text
src/
  main.js
  engine/
    audio/
    core/
    editor/
    render/
  games/
    kaninkapina/
      content/
      assets/
content-packs/
```

## Layers

`src/engine/` contains reusable systems that should not know about rabbits, carrots, or Kaninkapina-specific rules. Current first splits include music data, save keys, and editor presets. Future candidates are collision helpers, input, camera, renderer, audio playback, and the level editor shell.

`src/games/kaninkapina/` contains the Kaninkapina implementation: game rules, player behavior, enemies, bosses, pickups, hazards, UI copy, balance values, levels, rabbit styles, and assets.

`src/games/kaninkapina/content/` is for data-driven content. Levels and rabbit styles already live here. Additional Kaninkapina packs can add levels, characters, palettes, or tuning without changing the generic engine.

`content-packs/` is reserved for optional packs or themed experiments. A pack can later provide its own levels, metadata, assets, or even a different game module using the same engine.

## Repository Strategy

Keep this as one repository for now. Split the engine into a separate repository only after the engine API is stable enough to be useful outside Kaninkapina.

## Next Extraction Targets

1. Move collision, clamp, save, and camera helpers into `src/engine/core/`.
2. Move drawing primitives and environment rendering into `src/engine/render/`.
3. Move audio playback functions into `src/engine/audio/`.
4. Move Kaninkapina-specific systems into files such as `player.js`, `enemies.js`, `boss.js`, `pickups.js`, and `hazards.js`.
