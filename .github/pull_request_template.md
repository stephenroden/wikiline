## Checklist
- [ ] Components are presentational; side effects live in services/stores
- [ ] No direct DOM access without `DOCUMENT`/`Renderer2` or a dedicated UI service
- [ ] OnPush + signals used for stateful components
- [ ] Templates are not inlined for non-trivial components
- [ ] Lists use `trackBy`
- [ ] New logic has colocated tests (`*.spec.ts`)
- [ ] `ng test`, `ng lint`, and `ng build --configuration production` pass
