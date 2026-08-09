# Discipline Plugin Separation Implementation Record

The original plan assigned OpenSpec sink validation and archive lifecycle
enforcement to `opl`. That contradicted the intended layered-handler model and
has been superseded by the corrected design in
`docs/superpowers/specs/2026-08-08-discipline-plugin-separation-design.md`.

Implemented boundaries:

- `opl` classifies text, invokes enabled domain handlers, and rejects only
  unhandled deferrals.
- `opl-openspec` verifies OpenSpec deferral sinks.
- `opl-openspec` owns and registers OpenSpec archive discipline.
- provider failure is fail-closed.
- tests exercise behavior and package ownership.
