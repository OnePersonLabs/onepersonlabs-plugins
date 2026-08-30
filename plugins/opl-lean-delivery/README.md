# OPL Lean Delivery

`$lean-delivery` coordinates substantial implementation work with a compact
acceptance capsule, continuity between implementation and review, consolidated
repairs, and verification proportionate to the repository's own gates.

Repository owners control mutation and workflow policy in
`.agents/lean-delivery.toml`. The bundled standard-library reader resolves the
Git root, validates the complete versioned schema, and emits JSON without
modifying the repository. See
[`skills/lean-delivery/references/configuration.md`](skills/lean-delivery/references/configuration.md)
for the supported settings and missing-policy behavior.

## Provenance

This skill was independently authored after studying Projector's
[`projector-lean-delivery` skill](https://github.com/OnePersonLabs/projector/blob/main/.agents/skills/projector-lean-delivery/SKILL.md).
It preserves the causal ideas that generalize across repositories: compact
acceptance context, continuity review, one consolidated repair batch, bounded
closure, and lean full-gate timing.

It deliberately does not assimilate Projector phases or task numbering,
Projector commands, named model or reasoning assignments, fixed package-manager
gates, arbitrary size thresholds, mandatory worktrees or commits, or redundant
broad review passes. No Projector runtime or infrastructure is bundled.
