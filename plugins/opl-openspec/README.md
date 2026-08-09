# OpenSpec

OpenSpec workflow skills for Codex.

This plugin bundles the `openspec-*` workflow skills, the `openspec-x-*` dependency and orchestration extensions, their supporting scripts, and structural hooks that keep OpenSpec changes coherent. Install it from the One-Person Labs plugin marketplace, then invoke skills with names such as `$openspec-propose`, `$openspec-apply-change`, or `$openspec-x-finish`.

Install `opl` alongside this plugin for universal response and artifact discipline enforcement. `opl-openspec` handles deferrals backed by existing active or archived OpenSpec changes before `opl` applies its unhandled-deferral catch-all. It also owns OpenSpec archive-time discipline, ordering and quality, stock-artifact protection, and change dependency validation.
