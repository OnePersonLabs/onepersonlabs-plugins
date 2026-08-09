# Discipline Plugin Separation Design

## Objective

Separate universal rejection from domain-specific deferral handling.

`opl` is the last-resort catch-all for ephemeral deferrals, TODO-shaped
placeholders, and incomplete work hand-waved in prose or artifacts. It does
not decide what constitutes a valid OpenSpec, Linear, or other workflow sink.

Domain plugins get the first chance to consume a deferral. A handler consumes
the line only after it recognizes its own syntax and proves that the durable
work item exists. Anything no handler consumes remains unhandled and is
rejected by `opl`.

## Ownership Boundary

### `opl`

Owns:

- phrase classification and false-positive exceptions;
- response and artifact catch-all hooks;
- the provider-neutral deferral-handler protocol and enabled-plugin discovery;
- grouped reports for unhandled deferrals and general MVP/laziness violations.

It contains no OpenSpec filesystem resolver, Linear transcript resolver, or
OpenSpec archive lifecycle hook.

### `opl-openspec`

Owns:

- recognition and verification of OpenSpec-backed deferrals;
- archive-time scanning of complete OpenSpec change artifacts;
- archive command parsing, archive order, and archive quality;
- OpenSpec dependency, stock-artifact, skill, and orchestration behavior.

It requires `opl` because its archive lifecycle hook reuses the universal text
classifier. The dependency is resolved from Codex's enabled-plugin catalog,
not from a guessed sibling or cache path.

## Handler Contract

Enabled domain plugins opt in with a script matching:

```text
scripts/codex-*-deferral-handler.sh
```

The catch-all sends JSON containing protocol version 1, the exact content
line, repository root, and transcript path. The handler returns one of:

- `{ "handled": true, "handler": "<domain>" }` after durable proof;
- `{ "handled": false }` when the line is outside its domain;
- `{ "handled": false, "recognized": true, "reason": "..." }` when the
  line claims that domain but proof is missing or invalid.

Handlers are invoked by the catch-all itself. Codex executes matching hooks
concurrently, so independent hooks cannot reliably communicate that one has
pre-empted another.

## OpenSpec Behavior

The OpenSpec handler recognizes explicit `openspec/changes/<name>` references
and established follow-up token forms. It consumes the line only when the
corresponding active change or date-prefixed archived change directory exists.

The OpenSpec archive discipline gate is registered only in
`opl-openspec/hooks/hooks.json`. It parses the archive command with the same
OpenSpec-owned parser as the order and quality gates, scans all Markdown in the
change, and uses the universal classifier plus installed domain handlers.

## Failure Behavior

- Missing, disabled, malformed, failed, or timed-out handlers do not create an
  exemption; the catch-all rejects the line.
- A recognized OpenSpec reference without a matching change remains
  unhandled and is rejected with the OpenSpec handler's reason.
- MVP framing remains prohibited even when a domain handler consumes a
  deferral on another line.
- No local backlog or syntax-only fallback exists.

## Verification

Tests cover unhandled rejection, explicit provider consumption, enabled-plugin
discovery, missing OpenSpec proof, artifact enforcement, full-directory
archive scanning, robust archive parsing, and manifest ownership boundaries.
