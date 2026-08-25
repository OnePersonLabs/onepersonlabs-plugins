# Plugin Marketplace Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every immediate `plugins/` directory a consistently named Codex plugin, register the complete set, clean matching installed copies, reinstall, and deliver the verified result to `origin/main`.

**Architecture:** Treat each immediate directory under `plugins/` as the source of truth. Add root manifests only where missing, normalize manifest identity fields in place, and generate the repository marketplace from the resulting directory set. Use the existing `install.sh` for marketplace registration and plugin reinstall after a read-only audit of `~/.codex/plugins/`.

**Tech Stack:** JSON, Bash, Python helper scripts from `plugin-creator`, Codex CLI, Git.

## Global Constraints

- Each immediate plugin directory must contain `.codex-plugin/plugin.json`.
- Each manifest and marketplace name must start with `opl-`.
- Each `interface.displayName` must start with `OPL `.
- Marketplace source paths must use `./plugins/<plugin-name>`.
- Keep `AVAILABLE` installation and `ON_INSTALL` authentication policies.
- Remove only installed plugin directories that clearly match this repository.
- Preserve unrelated existing worktree content.

---

### Task 1: Add Missing Root Manifests

**Files:**
- Create: `plugins/opl-agent-spec/.codex-plugin/plugin.json`
- Create: `plugins/opl-docs-mcp-server/.codex-plugin/plugin.json`
- Create: `plugins/opl-nyx-skills/.codex-plugin/plugin.json`

**Interfaces:**
- Consumes: each plugin's existing `skills/` directory and README content.
- Produces: a root manifest with the plugin directory name, valid semver, descriptive metadata, `skills: "./skills/"`, and an `OPL ` display name.

- [ ] **Step 1: Run the repository scaffold helper with `--force` only for each missing manifest and with no marketplace update.**

```bash
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/plugin-creator/scripts/create_basic_plugin.py" opl-agent-spec --path plugins --force
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/plugin-creator/scripts/create_basic_plugin.py" opl-docs-mcp-server --path plugins --force
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/plugin-creator/scripts/create_basic_plugin.py" opl-nyx-skills --path plugins --force
```

- [ ] **Step 2: Edit the three generated manifests to use truthful descriptions, `One-Person Labs` as the author, and `OPL ...` display names while preserving their existing skill directories.**
- [ ] **Step 3: Parse all three manifests with `jq empty` and verify the root paths exist.**

### Task 2: Normalize Existing Manifest Identity

**Files:**
- Modify: each existing `plugins/opl-*/.codex-plugin/plugin.json` whose display name lacks the `OPL ` prefix.

**Interfaces:**
- Consumes: existing manifest fields.
- Produces: unchanged plugin behavior with normalized `name` and `interface.displayName` identity.

- [ ] **Step 1: Enumerate immediate plugin directories and assert every directory name starts with `opl-`.**
- [ ] **Step 2: Update only names or display names that violate the prefix rules.**
- [ ] **Step 3: Parse every manifest and confirm its `name` equals its parent directory.**

### Task 3: Rebuild the Repository Marketplace

**Files:**
- Modify: `.agents/plugins/marketplace.json`

**Interfaces:**
- Consumes: the 14 current immediate plugin directories and their normalized manifest names.
- Produces: one marketplace entry per directory, with no stale pre-rename entries.

- [ ] **Step 1: Generate entries with local source paths, `AVAILABLE` installation, `ON_INSTALL` authentication, and purpose-based categories.**
- [ ] **Step 2: Preserve the marketplace root name and display name.**
- [ ] **Step 3: Assert that marketplace names and filesystem plugin names form identical sets with no duplicates.**
- [ ] **Step 4: Parse the complete marketplace with `jq empty`.**

### Task 4: Audit and Remove Matching Installed Copies

**Files:**
- External target: `/home/zethj/.codex/plugins/`

**Interfaces:**
- Consumes: installed plugin directory names and manifests, plus repository names and stale names.
- Produces: removal of only clear repository-origin matches.

- [ ] **Step 1: List installed plugin directories, symlink targets, and manifests without changing them.**
- [ ] **Step 2: Match candidates by exact current or stale repository plugin name, manifest identity, or repository source metadata.**
- [ ] **Step 3: Remove only candidates with clear matches and record the removed paths.**
- [ ] **Step 4: Confirm no ambiguous installed plugin was removed.**

### Task 5: Reinstall and Verify

**Files:**
- Read: `install.sh`
- Modify only if a verification failure proves it is required.

**Interfaces:**
- Consumes: normalized `.agents/plugins/marketplace.json`.
- Produces: the local marketplace registered in Codex with every entry installed.

- [ ] **Step 1: Run `./install.sh` and capture failures without masking them.**
- [ ] **Step 2: Query the Codex plugin list and confirm every marketplace plugin is installed.**
- [ ] **Step 3: Run JSON, prefix, set-equality, source-path, and `git diff --check` verification.**

### Task 6: Commit and Push

**Files:**
- All current worktree changes requested by the user.

**Interfaces:**
- Consumes: verified repository and installed-plugin state.
- Produces: a commit on `main` pushed to `origin/main`.

- [ ] **Step 1: Review `git status` and the complete diff for accidental scope.**
- [ ] **Step 2: Stage all requested worktree changes.**
- [ ] **Step 3: Commit with a message describing plugin catalog normalization.**
- [ ] **Step 4: Push `main` to `origin`.**
- [ ] **Step 5: Confirm the working tree and upstream status.**
