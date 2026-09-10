# OPL Superpowers Lite

This plugin contains the evidence-first verification skill:

- [$verification-before-completion](skills/verification-before-completion/SKILL.md)

For debugging, use [$debug](../opl/skills/debug/SKILL.md) in the `opl` plugin.
It combines this bundle's former `systematic-debugging` discipline with focused
reproduction and regression-check practices.

The `opl` plugin now owns [conditional compatibility warnings](../opl/compatibility/README.md).
Its verification rule checks alternatives only while this plugin's
`$verification-before-completion` skill is enabled. This bundle no longer ships
the blanket Superpowers plugin warning; Lite used on its own runs no checker.

Superpowers Lite preserves verification discipline without loading the full Superpowers workflow pack. The original lightweight packaging was motivated by this [r/codex discussion](https://www.reddit.com/r/codex/comments/1uzbpec/does_superpowers_suck_with_56_and_just_eat_tokens/), which contains anecdotal reports of increased token use, overcomplicated workflows, and users retaining only debugging or verification. That discussion is community feedback, not benchmark evidence.
