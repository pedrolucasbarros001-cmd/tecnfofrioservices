# Architecture rules

- Keep shared visual materials, shadows and motion in `src/index.css` and apply them through existing UI primitives so all roles share presentation without altering operational flows.
- Keep modal sizing viewport-aware while retaining Radix focus, dismissal and nested portal handling; print-specific layouts retain their dedicated rules.