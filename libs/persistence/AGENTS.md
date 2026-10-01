# Persistence library

- Keep filesystem and Git interaction in `src/index.ts`; serialization validation belongs in `src/codec.ts`.
- Use the public `@next-step/domain` and `@next-step/application` APIs; do not import across projects by relative path.
- State is created lazily under `.next-step/state.yml`, written by same-directory atomic rename, and excluded through the repository-local Git exclude file only.
