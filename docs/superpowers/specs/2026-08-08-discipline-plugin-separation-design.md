# Discipline Plugin Separation Design

## Objective

Separate `opl-openspec` from `opl-onepersonlabs` by ownership rather than by
duplicating hook implementations. `opl-onepersonlabs` owns the universal
discipline rule: an agent may not leave ephemeral deferrals, TODO-shaped
placeholders, or incomplete work hand-waved in chat or artifacts. A deferral
is valid only when it resolves to a work item in a durable tracking system.

`opl-openspec` owns OpenSpec workflow integrity. OpenSpec is one approved
durable sink, not the owner of the general discipline policy.

## Ownership Boundary

### `opl-onepersonlabs`

Owns:

- the discipline policy and phrase classifiers;
- response, artifact, and pre-archive discipline hooks;
- bypass and persistent-exception behavior;
- grouped block reports;
- durable-sink reference parsing and proof validation;
- the OpenSpec filesystem proof adapter;
- the Linear connected-app transcript proof adapter.

Its hooks run even when `opl-openspec` is absent. The pre-archive hook is
integration-aware: it recognizes an OpenSpec archive command and applies the
universal discipline policy at that lifecycle boundary.

### `opl-openspec`

Owns:

- OpenSpec skills and supporting workflow scripts;
- stock OpenSpec artifact protection;
- archive order and archive quality validation;
- OpenSpec dependency validation and orchestration.

It does not own copies of the discipline policy, general safety hooks, skill
review hooks, or skill-reference hooks. Installing `opl-openspec` may assume
that `opl-onepersonlabs` is also installed for universal discipline
enforcement, but neither plugin sources files through an unstable installed
plugin path.

## Durable Deferral Contract

A line containing deferral language is blocked unless the same line includes
one resolvable durable reference. A reference is evidence, not permission to
leave work incomplete: it is accepted only for a genuinely separate unit of
work. MVP/version framing remains independently prohibited.

Initially supported references are:

- OpenSpec: an explicit `openspec/changes/<kebab-name>/` path or an unambiguous
  change token in the existing follow-up form. The validator requires the
  corresponding active or date-prefixed archived change directory to exist.
- Linear: `<TEAM-KEY>-<NUMBER>: <exact issue title>`. The team key is not
  constrained to three letters and the issue number is not fixed-width. The
  candidate must be backed by a successful Linear connected-app tool result
  in the current transcript.

There is no repository-local backlog, fallback file, syntax-only exemption,
or chat-only TODO bucket. Unsupported references remain blocked.

## Linear Proof

The hook does not implement Linear authentication or GraphQL. The installed
Linear plugin already exposes connected `get_issue` and `save_issue` tools.

The transcript validator searches recent session records for successful calls
to either:

- `mcp__codex_apps__linear_get_issue`; or
- `mcp__codex_apps__linear_save_issue`.

It requires the tool result to contain the canonical issue identifier and
title. Both must match the claimed `<ID>: <title>` reference. Merely calling a
tool, emitting a plausible identifier, or mentioning a Linear URL is
insufficient.

If proof is absent, the block report instructs the agent to use the Linear
plugin to retrieve an existing issue or create a new issue, then retry the
blocked action. Authentication and connection failures remain failures: the
agent must complete the work instead of silently deferring it.

## Hook Data Flow

### Response stop

1. Read the last assistant prose from the transcript and remove fenced code.
2. Classify MVP, deferral, and placeholder language.
3. For each deferral hit, extract a same-line durable reference.
4. Validate OpenSpec references against the repository and Linear references
   against connected-app transcript proof.
5. Block unresolved hits and allow fully resolved deferrals.

### Artifact write

1. Read inserted or written content from the tool payload.
2. Scan newly introduced text in any artifact, rather than coupling deferral
   scanning to `openspec/changes/*.md`.
3. Validate durable references using repository and transcript evidence.
4. Report unresolved placeholders immediately after the edit.

### OpenSpec archive boundary

1. Detect an archive `mv` command.
2. Scan every Markdown artifact in the change directory.
3. Validate all durable references again, including pre-existing content not
   observed by the artifact hook.
4. Block the archive when any deferral lacks durable proof.

OpenSpec archive order, quality, and dependency hooks continue to run
separately because they enforce structural workflow invariants rather than the
universal deferral policy.

## Policy Refactoring

The shared policy separates detection from disposition:

- scanners produce typed hits with source location, content, and matched
  phrase;
- MVP hits are always unresolved unless covered by the existing false-positive
  mechanisms;
- deferral/placeholder hits pass through durable-sink resolution;
- reports group unresolved hits and identify the exact missing proof.

The initial placeholder class includes deliberate prose deferrals and newly
introduced TODO/FIXME-style markers. Detection stays narrow enough to avoid
flagging arbitrary historical files: artifact mode scans the tool's introduced
text, response mode scans assistant prose, and archive mode scans the selected
change directory.

## Migration

1. Keep the canonical discipline policy, exception file, response gate,
   artifact gate, and archive gate under `plugins/opl-onepersonlabs/scripts/`.
2. Register artifact and archive discipline hooks in
   `plugins/opl-onepersonlabs/hooks/hooks.json`.
3. Remove artifact and archive discipline hook registrations from
   `plugins/opl-openspec/hooks/hooks.json`.
4. Remove the duplicate discipline files and other unreferenced general hook
   scripts from `plugins/opl-openspec/scripts/` after reference checks pass.
5. Keep every OpenSpec-specific structural script used by its hook manifest or
   skills.
6. Update plugin metadata and READMEs to document the ownership and required
   companion installation.

## Failure Behavior

- Missing or malformed hook input fails safely without inventing proof.
- A claimed OpenSpec change that does not exist is unresolved.
- A Linear tool call without a successful result is unresolved.
- A Linear result with an ID match but a title mismatch is unresolved and
  reports both titles.
- A connected-app outage never turns a deferral into an implicit exemption.
- Bypass sentinels retain their existing false-positive-only semantics and do
  not become a normal deferral route.

## Verification

Automated tests cover:

- response, artifact, and archive modes independently;
- a prohibited ephemeral deferral with no reference;
- a valid active and archived OpenSpec reference;
- a missing OpenSpec change;
- a valid Linear `get_issue` proof;
- a valid Linear `save_issue` creation proof;
- missing, failed, malformed, ID-mismatched, and title-mismatched Linear proof;
- variable-length Linear team keys and issue numbers;
- TODO/FIXME placeholder detection in newly introduced text;
- MVP rules remaining blocked even beside a valid durable reference;
- hook manifests referencing only files owned by their plugin;
- no duplicate general-policy scripts remaining in `opl-openspec`.

Existing OpenSpec archive order and quality tests remain green. A manifest
test asserts that every configured hook command exists and that the OpenSpec
plugin contains no cross-plugin source paths.
