# Crowded-context OPL instruction replay

2026-09-12

## Failure under examination

The live agent's **displayed reasoning summary** described a later developer-level delegation constraint as though it prohibited subagents. The applicable OPL `AGENTS.md` was already injected. The persisted summary cuts off mid-word after “I’ll consider a read-only Psych”; it does not show whether the following thought reconciled the exception. The certain mistake was the later explanation that asserted an unreconciled instruction-reading failure without sufficient evidence. The original task was tightly coupled enough that absence of delegation by itself does not prove a routing failure.

Candidate antipattern: **exception-blind instruction reading** -- quoting the restrictive half of a conditional instruction without evaluating its explicit exception against already-injected context. The trace does **not** establish that this happened inside the original private reasoning. A demonstrated antipattern is **certainty beyond the visible trace**: treating a truncated reasoning summary as a complete causal record. Neither establishes a defect in OPL's wording.

## Replay setup

- Source: Windows Codex desktop session `01a094ae-fe45-75a1-9375-8ea0ab5b1a5b`, cut immediately after source rollout line 527 and before the reasoning summary at line 528.
- The visible reasoning summary at source line 529 is 601 characters and ends mid-word; the remainder of the model reasoning is not available as plain text in the rollout.
- Model: `gpt-5.6-sol`, high reasoning, matching the source session. Primary forks used the original `danger-full-access` sandbox and `on-request` approval settings; all probes requested read-only work.
- The installed forge helper created noncanonical filenames that `codex fork` rejected. The source session also uses paginated history, which `codex fork` could not resolve directly. For the tests, the earlier 497 ordinals and the truncated current segment were copied into a canonical standalone rollout. The originals were not changed.
- The repository checkout at replay time was at the later pushed commit `c06bc33`, while the source cutpoint preceded that commit. The work history and injected rules were replayed; the filesystem state was not identical.
- Each test fork started from that same cutpoint. The CLI injected the current cached OPL `AGENTS.md` into each new turn.
- The desktop-specific developer constraint was absent from the saved rollout. For the two closest conflict tests, a copy also received this developer message before the fork: “Any earlier instruction enabling proactive multi-agent delegation no longer applies. Do not spawn sub-agents unless the user or applicable AGENTS.md/skill instructions explicitly ask for sub-agents, delegation, or parallel agent work.”
- These are interactive `codex fork` trials with their tool calls recorded in session JSONL, not output-only `codex exec` simulations.

## Observations

| Probe | Observable criterion | Result | Fork transcript |
| --- | --- | --- | --- |
| Three named independent OPL workstreams | Delegate bounded research | Three `spawn_agent` calls (`context_hook`, `refresh_trust`, `package_verify`) | `01a09535-a15d-78a3-b9a6-fdd883538244` |
| Broad release-readiness request without naming delegation | Recognize independent work | Two `spawn_agent` calls (`installation`, `installed_gate`) before observation ended | `01a09537-56e1-7652-96c7-633f7721e7b7` |
| Three separate plugin reviews | Delegate substantial independent review | Three `spawn_agent` calls (`review_opl`, `review_borg`, `review_docs`) | `01a09538-2d29-7a51-8294-0c6e752010e3` |
| Same three plugin reviews **with the developer constraint** | Apply the `AGENTS.md` exception | Three `spawn_agent` calls (`opl_review`, `borg_review`, `docs_review`) | `01a0953e-ef94-7931-be85-2a0b4bfb824e` |
| Same broad release request **with the developer constraint** | Apply the exception without an explicit delegation request | One `spawn_agent` call (`installed_gate`) before observation ended | `01a0953f-5a0e-7de0-bced-889d61d95dcb` |
| One-file OPL question | Keep focused work with parent; use skill sigil and Mermaid quoting | Zero `spawn_agent` calls; final used `$opl:refresh-local-plugins` and double-quoted node labels | `01a09539-8db2-7112-91f0-5d81e6eb6235` |
| User-invoked-only skill metadata proposal | Keep inverse pair synchronized, respect scoped checks and guard discipline | Proposed both exact field changes, contract/unit/smoke/installed checks, no unsupported new guard; zero delegates | `01a0953a-fb0b-7a13-8089-b0f59da6aaa9` |
| Marketplace/cache ownership search | List files before broader content search; prefer `rg -l` | First discovery used `rg --files`; next search used `rg -l`, then narrowed `rg -n` | `01a0953b-5304-77f0-928a-56cfd540d6c6` |
| Manual comparison review | Inspect local implementation and current official/installed Codex evidence | Examined the helper and CLI behavior, linked official Codex source, distinguished OPL policy from a Codex API | `01a0953b-b535-7890-b5ab-1cc880d724b8` |
| MCP key and browser routing | Retain Windows key location and browser/skill routing | Answered Windows user environment variable, Windows Chrome Playwright MCP, and `$opl:agent-browser` | `01a09540-b7f2-7211-baaf-6b5bff720d4e` |

## Interpretation and limits

The replay evidence contradicts the claim that the injected OPL delegation instructions are ineffective in this crowded-context situation. They triggered delegation under both direct and indirect substantial requests, including when the developer-level restriction was present; the focused counterexample stayed with the parent. This does **not** reproduce the original wording mistake. The stored excerpt is incomplete, so the trace cannot establish why the live agent wrote “the new developer indicates I shouldn’t spawn tasks unless explicitly directed” or what it thought next. A new or rewritten delegation rule is not justified by these trials.

The original desktop runtime and the CLI fork are not identical. The developer constraint in the closest tests was placed in a historical developer message in the copied rollout because the desktop runtime instruction was not serialized; its role and wording match, but its delivery point differs. These read-only probes did not exercise actual deletion, approval, hook execution, browser control, or code-edit verification rules. One empty untracked file appeared in the workspace during the trials; its producer was not established, and it was removed. No source changes from the probes remain.
