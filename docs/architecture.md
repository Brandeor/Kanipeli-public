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

`src/engine/` contains reusable systems that should not know about rabbits, carrots, or Kaninkapina-specific rules. Current first splits include music data, audio playback, save keys, storage helpers, geometry helpers, side-scroller camera helpers, and editor presets. Future candidates are input, renderer, and the level editor shell.

`src/games/kaninkapina/` contains the Kaninkapina implementation: game rules, player behavior, enemies, bosses, pickups, hazards, UI copy, balance values, levels, rabbit styles, and assets.

`src/games/kaninkapina/content/` is for data-driven content. Levels and rabbit styles already live here. Additional Kaninkapina packs can add levels, characters, palettes, or tuning without changing the generic engine.

`content-packs/` is reserved for optional packs or themed experiments. A pack can later provide its own levels, metadata, assets, or even a different game module using the same engine.

## Repository Strategy

Keep this as one repository for now. Split the engine into a separate repository only after the engine API is stable enough to be useful outside Kaninkapina.

The local checkout uses two GitHub remotes:

- `origin` -> `https://github.com/Brandeor/Kanipeli.git`
- `public` -> `https://github.com/Brandeor/Kanipeli-public.git`

`origin` is the main working repository. Push normal development commits there first:

```bash
git push origin main
```

`public` is the public mirror used for the playable GitHub Pages build. After a commit is ready for public release, push the same `main` branch there:

```bash
git push public main
```

## GitHub Pages Publishing

GitHub Pages is deployed from `Brandeor/Kanipeli-public` by `.github/workflows/pages.yml`. The workflow runs on pushes to `main` and can also be started manually with `workflow_dispatch`.

The workflow is intentionally guarded with:

```yaml
if: github.repository == 'Brandeor/Kanipeli-public'
```

This means the Pages deployment only runs in the public repository, even though the workflow file also exists in the working repository. The deploy job copies the static game files into `dist/`:

- `index.html`
- `styles.css`
- `package.json`
- `src/`
- `scripts/`
- `docs/`
- `.nojekyll`

Then it uploads `dist/` as the Pages artifact and publishes it with `actions/deploy-pages`.

The public game URL is:

```text
https://brandeor.github.io/Kanipeli-public/
```

Recommended release flow:

1. Make and test changes locally.
2. Commit to `main`.
3. Push to `origin/main`.
4. Push the same commit to `public/main`.
5. Check the public Pages URL after the workflow finishes.

## Next Extraction Targets

1. Continue moving small reusable core helpers into `src/engine/core/` as they become independent of Kaninkapina state.
2. Move drawing primitives and environment rendering into `src/engine/render/`.
3. Move Kaninkapina-specific systems into files such as `player.js`, `enemies.js`, `boss.js`, `pickups.js`, and `hazards.js`.
4. Split the level editor into a reusable editor shell and Kaninkapina-specific editor tools.
