# OpenSpec

OpenSpec workflow skills for Codex.

This plugin bundles the `openspec-*` workflow skills, focused semantic audit and reconciliation extensions, their supporting scripts, and structural hooks that keep selected OpenSpec changes coherent. Install it from the One-Person Labs plugin marketplace, then invoke skills with names such as `$openspec-propose`, `$openspec-apply-change`, or `$openspec-x-finish`.

Install `opl` alongside this plugin for universal response and artifact discipline enforcement. `opl-openspec` handles deferrals backed by existing active or archived OpenSpec changes before `opl` applies its unhandled-deferral catch-all. It also requires active artifacts to be edited inside an OpenSpec skill workflow, and owns archive-time discipline and quality plus stock-artifact protection. Work queues, priority, blocking relationships, and multi-change scheduling belong to an external work tracker rather than this plugin.
