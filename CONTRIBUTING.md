# Contributing

This project prioritizes Angular best practices. Please follow the checklist below for every change.

## Code Review Checklist
- Architecture
  - Components stay presentational; side effects live in services/stores.
  - No direct DOM access unless via `DOCUMENT`/`Renderer2` or a dedicated UI service.
  - Signals and OnPush are used for stateful components.
- Templates
  - No inline templates for non-trivial components.
  - Lists use `trackBy`.
  - Avoid heavy logic in templates; move to component/store.
- Types & Style
  - Strict TypeScript rules are respected (no `any` without a clear reason).
  - Kebab-case filenames and PascalCase classes.
- Tests & CI
  - New logic includes colocated `*.spec.ts` tests.
  - `ng test`, `ng lint`, and `ng build --configuration production` pass locally or in CI.

## Development Notes
- Prefer colocated component folders: `component-name/component-name.component.{ts,html,scss,spec.ts}`.
- Use Angular schematics defaults; avoid inline templates/styles.
- CI enforces `lint`, `test`, and production `build` on every PR.
