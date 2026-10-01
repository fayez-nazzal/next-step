# next-step

A deliberately tiny terminal app that keeps the next active step visible. Keep the product minimal; no tmux dependency or integration.

- Runtime/package manager: Bun; ESM TypeScript. `bun install` commits `bun.lock`.
- Quality gates: `bun run check`; focused commands: `bun run format`, `bun run lint`, `bun run typecheck`, `bun run test:coverage`, `bun run build`.
- Architecture: `domain <- application <- adapters`; app is composition root. Persistence may use application/domain; TUI uses application/domain, never persistence.
- Use public aliases only: `@next-step/domain`, `@next-step/application`, `@next-step/persistence`, `@next-step/tui`. No cross-project relative/deep imports. OpenTUI/React only in `libs/tui`; YAML/filesystem only in persistence.
- State is launch-directory-local at `.next-step/state.yml`, versioned and limited to active steps. No selection/UI/environment metadata.
- Test every pure/stateless function at 100% lines, statements, functions, branches; cover persistence IO with focused integration tests. Avoid visual snapshots without behavioral value.
- TUI: native terminal text, responsive Flexbox, calm compact layout. Focus indicators require confirmed terminal focus; no tmux workaround.
