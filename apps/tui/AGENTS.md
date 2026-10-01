# CLI composition root

Only obtain `process.cwd()`, construct the ID generator/repository/application, launch `@next-step/tui`, and handle shutdown. No business logic, direct OpenTUI/React imports, filesystem access, or state format handling. Use public aliases only.
