# Semantic Megazord Predecessor Manifest

Status: temporary ignored research and extinction-staging corpus  
Created: 2026-08-27 (America/Chicago)  
Repository: `$HOME/dev/onepersonlabs-plugins`  
Branch at staging: `main`  
HEAD at staging: `afef51e12eb08f1270a7e4a0a8acef766582caba`

## Purpose and disposal rule

This directory preserves the sources needed to design, implement, evaluate, and
audit the unified semantic and communication plugin. It is not a second source
tree and must not become a runtime dependency.

Keep this corpus through architecture and implementation. Delete the complete
`.temp/predecessors/` tree only after the new plugin passes the capability,
interaction, negative-routing, fidelity, cost, license, migration, and
clean-session extinction gates described in the architecture handoff.

The repository ignores `.temp/`. The external Git checkouts under
`$HOME/dev/` are independent research clones and can remain after extinction
unless the user asks to remove them.

## Initial repository state

The only pre-existing tracked changes were user-owned deletions:

- `plugins/opl-matt-pocock-skills-misc/skills/scaffold-exercises/SKILL.md`
- `plugins/opl-matt-pocock-skills-misc/skills/scaffold-exercises/agents/openai.yaml`

The preparation work did not restore or edit those files.

## Verification method

- `TRACKED_BLOBS.tsv` records the Git mode, original blob OID, original path,
  and staged path for every moved tracked file.
- All 58 moved files were checked after the move with
  `git hash-object --no-filters`; every staged blob matched `HEAD`.
- The only executable tracked predecessor remained executable; every
  non-executable file retained its mode.
- Each original moved path was checked absent.
- The copied OPL `AGENTS.md` matched source blob
  `ac68049728a5658cc11d03f0203b0053e27da387`.
- External snapshots were compared with `rsync -ani --delete` against their
  recorded source checkouts/packages; every comparison returned zero changes.
- Directory tree digests below are SHA-256 hashes of the sorted per-file SHA-256
  list. They are inventory receipts, not upstream release signatures.

## External predecessors

| Predecessor | Origin and version | License boundary | Staged path | Files | Verification |
| --- | --- | --- | --- | ---: | --- |
| Caveman | `https://github.com/JuliusBrussee/caveman` at `17f9f2ec2377b0bfe16b52ee03a462e7f0a02bc8` | Split MIT / BSL-1.1; see warning below | `external/Caveman/` | 1,393 | clean clone; rsync exact; tree SHA-256 `9b88a834217ff69b8f5320b88c75cc83dfd22dc2f98293111ff5795b10e9da64` |
| SimpleEnglish | `https://github.com/AminBlg/SimpleEnglish` v1.3.0 at `8e8a008a13e4b478f9ccc20ca16e79aef66c0739` | MIT | `external/SimpleEnglish/` | 286 | clean clone; rsync exact; tree SHA-256 `52c37e61508ddd251c4862de9834d7312402c61ebdf2bf6501024cd21129f38a` |
| ExplainX article | `https://explainx.ai/blog/asd-ste100-simplified-technical-english-ai-skill-2026` | Copyright remains with publisher; research reference only | `external/SimpleEnglish-Article.md` | 1 | SHA-256 `166c384e134d8db9f66e3d8f9b0b28d070090ccae52cd912d69fdf9d466bb326` |
| Code Ontology Companion | installed OpenAI curated package v0.5.2; upstream `https://github.com/battle-doll/code-ontology-companion` | Apache-2.0 plus bundled third-party notices/SBOM | `external/CodeOntologyCompanion-0.5.2/` | 31 | installed package exact except generated Python caches; tree SHA-256 `63ec0694f8bab233f49bdd204700880d45f4b7fdd5fe49a7a8971013d139f67e` |

### Caveman license warning

Caveman is preserved in full because architecture research needs the complete
system, but code reuse is not uniformly permitted under MIT.

MIT adoption surfaces include `skills/`, `evals/`,
`packages/agent/`, `packages/create-caveman-agent/`, `packages/cli/`,
the thin SDK/client surfaces listed in `LICENSING.md`, public contracts, and
other paths explicitly classified as MIT there.

The engine-linked runtime is BSL-1.1. In particular, do not copy code from
`engine/`, `cacheengine/`, `rewriter/`, `browse/`, `proxy/`,
`mcp/`, `shrink/`, the Go core of `mem/`, or `shared/platform/` into
the new plugin. Absorb ideas only through an independent implementation. Check
`external/Caveman/LICENSING.md`, `LICENSE`, and `LICENSE.BSL` before
reusing any Caveman source.

## Repository predecessors moved for full retirement

Every staged destination below is relative to
`.temp/predecessors/onepersonlabs-plugins/`. These are exact moves, not edited
copies.

| Original path | Disposition | Tracked files | Version / license note |
| --- | --- | ---: | --- |
| `plugins/opl-ste-writing/` | move | 19 | plugin `0.1.0+codex.20260809023056`; repository-local source; bundled STE rewriter has an MIT license |
| `plugins/opl/skills/ubiquitous-language/` | move | 2 | OPL `0.1.0+codex.20260825174617`; no standalone license declaration in the skill |
| `plugins/opl/skills/humanize-mbj/` | move | 2 | OPL `0.1.0+codex.20260825174617`; no standalone license declaration in the skill |
| `plugins/opl/skills/simple-docs-generator/` | move | 2 | OPL `0.1.0+codex.20260825174617`; no standalone license declaration in the skill |
| `plugins/opl/skills/illuminator-docs-generator/` | move | 3 | OPL `0.1.0+codex.20260825174617`; no standalone license declaration in the skill |
| `plugins/opl-matt-pocock-skills-engineering/skills/domain-modeling/` | move | 4 | plugin `0.1.0+codex.20260809023056`; no standalone license declaration in the skill |
| `plugins/opl-matt-pocock-skills-engineering/skills/codebase-design/` | move | 4 | plugin `0.1.0+codex.20260809023056`; no standalone license declaration in the skill |
| `plugins/opl-matt-pocock-skills-engineering/skills/improve-codebase-architecture/` | move | 3 | plugin `0.1.0+codex.20260809023056`; no standalone license declaration in the skill |
| `plugins/opl-matt-pocock-skills-engineering/skills/grill-with-docs/` | move | 2 | plugin `0.1.0+codex.20260809023056`; no standalone license declaration in the skill |
| `plugins/opl-matt-pocock-skills-in-progress/skills/writing-fragments/` | move | 2 | plugin `0.1.0+codex.20260809023056`; no standalone license declaration in the skill |
| `plugins/opl-matt-pocock-skills-in-progress/skills/writing-shape/` | move | 2 | plugin `0.1.0+codex.20260809023056`; no standalone license declaration in the skill |
| `plugins/opl-matt-pocock-skills-in-progress/skills/writing-beats/` | move | 2 | plugin `0.1.0+codex.20260809023056`; no standalone license declaration in the skill |
| `plugins/opl-matt-pocock-skills-personal/skills/edit-article/` | move | 2 | plugin `0.1.0+codex.20260809023056`; concept donor / retirement target; no standalone license declaration |
| `plugins/opl-nyx-skills/skills/public-copy-release-guard/` | move | 3 | mirrored from Ornn/ChronoAIProject; skill v0.2 declares MIT |
| `plugins/opl-nyx-skills/skills/research-claim-fidelity-reviewer/` | move | 3 | mirrored from Ornn/ChronoAIProject; skill v0.1 declares MIT |
| `plugins/opl-nyx-skills/skills/source-grounded-research-announcement/` | move | 3 | mirrored from Ornn/ChronoAIProject; skill v0.1 declares MIT |

## Repository source copied, not retired

| Original path | Disposition | Staged path | Verification |
| --- | --- | --- | --- |
| `plugins/opl/AGENTS.md` | copy / reference snapshot | `onepersonlabs-plugins/plugins/opl/AGENTS.md` | Git blob `ac68049728a5658cc11d03f0203b0053e27da387` |

OPL still owns unrelated live behavior. Do not delete the live file merely
because this research copy exists.

## Reference-in-place donors and consumers

These were deliberately not moved:

- `plugins/opl-agent-spec/`, including Rust Atlas and the provider kit.
- `plugins/opl/skills/agent-instructions/`, instruction optimization, and the
  unslop family.
- Review, verification, debugging, TDD, implementation, planning, Agent Spec,
  OpenSpec, research, browser, media, publishing, migration, and setup
  workflows that retain independent authority.

The architecture handoff explains what each category donates or consumes and
why swallowing it would create an instruction god object.

## Adjacent state changes

- Removed installed plugin `opl-ste-writing@onepersonlabs-plugins` before
  moving its source.
- Removed its local marketplace entry.
- Removed moved skills from the three simple inventory READMEs.
- Removed the orphaned
  `hooks.state."opl-ste-writing@onepersonlabs-plugins:..."` trust record from
  `$HOME/.codex/config.toml` after uninstall revealed that it still executed a
  now-missing cached hook and broke `apply_patch`.
- Committed the tracked transition as `32c239e` and pushed it to `origin/main`.
- Refreshed the enabled cached installations of OPL, Matt Engineering, Matt In
  Progress, Matt Personal, and Nyx from the committed local marketplace source.
  Their contents now match source, but their unchanged manifest versions make
  this an intermediate local state rather than a versioned release.
- A temporary cache copy was restored only to let the already-loaded current
  session complete safely. Remove that orphan cache after the last edit in this
  session; the plugin remains uninstalled.

Other global predecessor records are intentionally left for coordinated
replacement migration and are enumerated in the architecture handoff.
