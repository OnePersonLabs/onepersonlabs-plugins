# Discipline Plugin Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `opl-onepersonlabs` the sole owner of universal discipline enforcement while `opl-openspec` retains only OpenSpec workflow integrity.

**Architecture:** The OnePersonLabs Bash policy classifies prohibited text and resolves deferral hits through verified sinks. OpenSpec proof comes from active or archived change directories; Linear proof comes from successful connected-app `get_issue` or `save_issue` transcript records matching identifier and title. Discipline hooks run only from OnePersonLabs, so OpenSpec carries no duplicate general policy.

**Tech Stack:** Bash 4+, `jq`, Node.js built-in test runner, JSON hook manifests.

## Global Constraints

- No local backlog, fallback file, syntax-only exemption, or chat-only TODO bucket.
- Linear authentication and API access remain owned by the installed Linear plugin.
- Missing or malformed proof fails closed.
- Preserve unrelated user work.

---

### Task 1: Executable Durable-Sink Specification

**Files:**
- Create: `plugins/opl-onepersonlabs/scripts/codex-discipline-gates.test.mjs`

**Interfaces:**
- Consumes: JSON hook input, temporary project trees, and JSONL transcripts.
- Produces: behavior tests for every enforcement mode and sink.

- [ ] **Step 1: Create `runHookStatus`, `writeTranscript`, and `linearProof` test helpers.**
- [ ] **Step 2: Test response blocking with no sink, missing proof, Linear title mismatch, and MVP text beside a valid sink.**
- [ ] **Step 3: Test response acceptance for an active OpenSpec change and matching Linear proof. Use `ONE-7` and `ENG-1778` to cover variable identifier widths.**
- [ ] **Step 4: Test artifact TODO/FIXME handling and full-directory archive handling.**
- [ ] **Step 5: Run the suite and confirm it fails before implementation.**

```bash
node --test plugins/opl-onepersonlabs/scripts/codex-discipline-gates.test.mjs
```

Expected: sink-resolution cases fail and OnePersonLabs artifact/archive scripts are absent.

---

### Task 2: Canonical Policy Refactor

**Files:**
- Modify: `plugins/opl-onepersonlabs/scripts/codex-discipline-policy.sh`
- Modify: `plugins/opl-onepersonlabs/scripts/codex-response-discipline-gate.sh`
- Test: `plugins/opl-onepersonlabs/scripts/codex-discipline-gates.test.mjs`

**Interfaces:**
- Produces: `resolve_openspec_change`, `extract_openspec_reference`, `extract_linear_reference`, `linear_transcript_has_issue`, and `resolve_deferral_line`.

- [ ] **Step 1: Keep MVP scanning unchanged; add bounded TODO/FIXME placeholder hits and separate hit detection from blocking.**
- [ ] **Step 2: Implement `resolve_openspec_change <name>` for active and date-prefixed archived directories.**
- [ ] **Step 3: Implement `extract_linear_reference <line>` for customizable uppercase team keys and positive integer issue numbers followed by an exact claimed title.**
- [ ] **Step 4: Implement `linear_transcript_has_issue <id> <title>` by parsing successful JSON result records associated with tool names ending in `linear_get_issue` or `linear_save_issue`. Never trust assistant prose.**
- [ ] **Step 5: Implement `resolve_deferral_line <line>` so one verified supported reference resolves a deferral hit but never an MVP hit.**
- [ ] **Step 6: Report the exact missing OpenSpec or Linear proof and direct the agent to the installed Linear tools.**
- [ ] **Step 7: Run the tests; response cases must pass.**

---

### Task 3: Transfer Hook Ownership

**Files:**
- Create: `plugins/opl-onepersonlabs/scripts/codex-artifact-discipline-gate.sh`
- Create: `plugins/opl-onepersonlabs/scripts/codex-archive-discipline-gate.sh`
- Modify: `plugins/opl-onepersonlabs/hooks/hooks.json`
- Modify: `plugins/opl-openspec/hooks/hooks.json`

**Interfaces:**
- Consumes: canonical local policy functions.
- Produces: artifact and archive discipline enforcement registered only by OnePersonLabs.

- [ ] **Step 1: Move the artifact gate and scan all newly inserted artifact text, not only OpenSpec Markdown.**
- [ ] **Step 2: Move the archive gate, retain complete Markdown-tree scanning, and use canonical durable-sink resolution.**
- [ ] **Step 3: Register archive PreToolUse and artifact PostToolUse hooks in OnePersonLabs.**
- [ ] **Step 4: Remove those registrations from OpenSpec without changing its structural guards.**
- [ ] **Step 5: Run the complete discipline test suite and require all cases to pass.**

---

### Task 4: Delete Duplicates and Repair Boundaries

**Files:**
- Delete: OpenSpec copies of discipline gates, policy, and exceptions.
- Delete if unreferenced: OpenSpec copies of dangerous-shell, skill-judge, and skill-reference-sigil gates.
- Modify: both plugin manifests and READMEs.
- Create: `plugins/opl-onepersonlabs/scripts/codex-plugin-boundaries.test.mjs`

**Interfaces:**
- Produces: manifests whose hook commands exist locally and no general-governance scripts in OpenSpec.

- [ ] **Step 1: Test that every hook command resolves within its plugin, OpenSpec has no general policy scripts, and OnePersonLabs exports hooks.**
- [ ] **Step 2: Use `rg` to prove each stale OpenSpec script is unreferenced before deleting it.**
- [ ] **Step 3: Fix OpenSpec hook command filename mismatches to retained `codex-openspec-archive-order-gate.sh` and `codex-openspec-archive-quality-gate.sh`.**
- [ ] **Step 4: Correct OnePersonLabs name/display metadata, export `./hooks/hooks.json`, and document the ownership boundary in both READMEs.**
- [ ] **Step 5: Run boundary tests and the existing OpenSpec archive-order suite.**

```bash
node --test plugins/opl-onepersonlabs/scripts/codex-plugin-boundaries.test.mjs
node --test plugins/opl-openspec/scripts/codex-openspec-archive-order-gate.test.mjs
```

---

### Task 5: Full Verification

**Files:**
- Modify only for an in-scope verification failure.

- [ ] **Step 1: Validate manifests and shell syntax.**

```bash
jq empty plugins/opl-onepersonlabs/hooks/hooks.json plugins/opl-openspec/hooks/hooks.json
bash -n plugins/opl-onepersonlabs/scripts/*.sh plugins/opl-openspec/scripts/*.sh
```

- [ ] **Step 2: Run all focused suites together.**

```bash
node --test plugins/opl-onepersonlabs/scripts/codex-discipline-gates.test.mjs plugins/opl-onepersonlabs/scripts/codex-plugin-boundaries.test.mjs plugins/opl-openspec/scripts/codex-openspec-archive-order-gate.test.mjs
```

- [ ] **Step 3: Verify no discipline ownership leaks remain in OpenSpec and run `git diff --check`.**
- [ ] **Step 4: Review scoped diff and repository status to ensure unrelated migration work remains untouched.**
