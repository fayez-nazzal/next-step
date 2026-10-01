# TUI library

This package owns terminal renderer startup and the React/OpenTUI surface. Keep application wiring outside this package; depend on the public domain and application package indexes only. OpenTUI runtime imports belong here, never in domain or application code. `launchTui` owns renderer/root lifecycle and exposes only its destroy and idle-wait handle.

Use the installed OpenTUI declarations as the source of truth for renderer and widget APIs. Keep all editing-mode keyboard input inside its editor; global navigation and mutation shortcuts must not run while an editor is open. Preserve selection by step ID as data changes, falling back to the first remaining step when removed.
