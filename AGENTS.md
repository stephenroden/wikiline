# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` holds the Angular standalone app code (components, config, logic).
- `src/assets/` is for static assets (images, fonts, etc.).
- `src/styles.scss` is the global stylesheet entry.
- `dist/` is the build output (generated).
- `angular.json` and `tsconfig*.json` define build and TypeScript settings.

## Build, Test, and Development Commands
- `npm start` (or `ng serve`): run the dev server at `http://localhost:4200` with live reload.
- `npm run build` (or `ng build`): build a production bundle into `dist/`.
- `npm run watch` (or `ng build --watch --configuration development`): rebuild on file changes.
- `ng generate component feature-name`: scaffold new Angular components.
- `ng test`: run unit tests via Karma (if configured; no test script is currently defined in `package.json`).

## Coding Style & Naming Conventions
- Indentation: 2 spaces in TypeScript and SCSS, matching existing files in `src/app/`.
- Angular naming: use kebab-case file names (e.g., `feature-card.component.ts`) and PascalCase class names.
- Keep templates inlined only when small; otherwise consider separate HTML/SCSS files for larger components.

## Testing Guidelines
- Framework: Angular CLI defaults (Karma + Jasmine) per `README.md`.
- Naming: test files should follow `*.spec.ts` when added.
- Run all tests with `ng test` once specs are in place.

## Commit & Pull Request Guidelines
- Commit history is not available in this directory (no `.git/`), so no existing convention can be inferred.
- Suggested convention: short, imperative summary (e.g., `Add drag-and-drop hint text`).
- PRs should include a brief description, any linked issue, and UI screenshots for visual changes.

## Configuration & Safety Notes
- Keep generated output (`dist/`) out of source edits; changes should originate in `src/`.
- If you add environment-specific settings, prefer Angular environment files under `src/`.
