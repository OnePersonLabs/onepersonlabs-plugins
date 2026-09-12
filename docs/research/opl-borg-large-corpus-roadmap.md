# OPL Borg large-corpus assimilation roadmap

**Planning status:** Read [Borg: current direction](opl-borg-current-direction.md) first. This roadmap predates the clarified requirement for an ongoing conceptual workspace and source-independent portable snapshots. Its source-processing and evaluation work remains useful, but the output contract and persistent lifecycle must be reconciled before executing the milestones as an implementation sequence.

Extend `$assimilate` into a workflow for mixed-source, multi-context design synthesis while preserving its existing emphasis on causal value, recipient coherence, explicit scope, and verification. The first release should make difficult source relationships and design decisions recoverable. Optional retrieval and execution infrastructure should follow evidence from representative campaigns.

This is an implementation proposal. No skill behavior, runtime, manifest, or evaluation case is changed by this roadmap. The [research report](opl-borg-large-corpus-assimilation.md) provides supporting literature, limitations, and the full architectural rationale.

## 1. Scope and baseline

The inspected repository baseline is commit `c0b73c99e985556a28031a2bd2bff6500f5c8d34`. The worktree was clean before the research artifacts were added. Design against the source checkout, which already includes a resource-economics paragraph absent from the installed skill inspected during this investigation. Do not mistake the installed copy for the latest source.

| Existing file | Keep | Proposed change |
| --- | --- | --- |
| `plugins/opl-borg/skills/assimilate/SKILL.md` | Mission boundary, causal value, refraction, native integration, survival tests | Expand source and recipient types; route intake, association, and spec-revision references |
| `plugins/opl-borg/skills/assimilate/references/campaign-state.md` | Landing file, IDs, work states, invalidation, recovery, cleanup | Add source ancestry, evidence versus interpretation, recipient revision, inspection depth, and retention distinctions |
| `plugins/opl-borg/skills/assimilate/references/orchestration.md` | Bounded packets, one writer, result acceptance, serial fallback, baton passes | Add evidence packs, resource discovery, total-cost accounting, recursion limits, and stale-result handling for designs |
| `plugins/opl-borg/skills/assimilate/agents/openai.yaml` | Explicit model-invoked policy | Update discovery text if needed; retain the inverse frontmatter/metadata pair |
| `plugins/opl-borg/README.md` | Assimilation philosophy and usage | Explain mixed-source campaigns, design endpoints, durable evidence, and actual host capabilities |
| `tests/evals/cases/opl-borg.jsonl` | Existing selection and lifecycle cases | Add representative branch, mixed-source, analogy, and design-only activation cases |

Suggested new references are `source-intake.md`, `associative-synthesis.md`, and `spec-evolution.md` under the existing skill. These are proposed responsibilities, not mandatory file counts. Keep the entry skill concise and route readers to only the relevant references.

Executable helpers belong in shipping skill scripts only if the installed skill must execute them. Any separate substantial product runtime belongs under `packages/`; tests remain under `tests/`, and repository development drivers remain under `tools/`. A shipping script must not require a development checkout at runtime. Use the existing repository packaging conventions when choosing the exact boundary.

## 2. Acceptance contract

A successful campaign can accept a large pile of local material and supported external captures, preserve its identities and relationships, identify useful mechanisms, evaluate their fit to an existing design, and produce coherent analysis and plan files. It can continue after losing conversational context without requiring the original discussion to be replayed.

The following properties define the initial target:

1. Every submitted source has an intake outcome. Every in-scope unit has a coverage status; inaccessible and unread material are visible.
2. Repeated chat ancestry is not interpreted as repeated independent agreement. Exploration, recommendation, and explicit user acceptance remain distinguishable.
3. Material findings point to original evidence. Contradictions, qualifications, and unusual mechanisms remain recoverable through deduplication and summarization.
4. Every accepted adaptation identifies a recipient problem, a mechanism, necessary assumptions, affected design areas, and a discriminating scenario.
5. Accepted changes preserve or explicitly revise recipient commitments. Dependent analysis and plan sections are reconciled at the same checkpoint.
6. A fresh reader can recover the next ready work item and identify live ownership or incomplete attempts.
7. Reported resource consumption distinguishes observation from estimation. A limit-induced stop preserves incomplete work and does not masquerade as completion.
8. A contained task remains lightweight. A campaign can execute serially without optional search services or subagent support.

These are acceptance properties for real artifacts. Repeating them in an agent response is not proof that they hold.

## 3. First milestone: one representative campaign

Construct a synthetic fixture with explicit provenance and expected evidence. Use original fixture text rather than copied private conversations or third-party copyrighted corpora. Keep the fixture outside shipping roots, proposed under `tests/fixtures/opl-borg/large-corpus/`.

The receiving design describes an offline-capable collaborative planning system. It has requirements for offline edits, explicit authority over published plans, and recovery after interrupted synchronization. Its specification spreads those commitments across requirements, synchronization, permissions, and migration sections.

The source pile contains these interacting elements:

| Fixture item | Planted difficulty | Expected observable behavior |
| --- | --- | --- |
| Shared chat trunk | Establishes offline editing as a user constraint | The requirement remains authoritative unless explicitly revised |
| Three sibling branches | Hosted coordination, local synchronization, and an exploratory online-only release | Branch assumptions remain separate; timestamps do not select a winner |
| Two handoffs | Repeat the trunk and paraphrase one branch as settled | Repetition is deduplicated; claimed acceptance is checked against evidence |
| Transcript | Describes a mechanism, then states a qualification later | Both mechanism and qualification reach the proposal |
| Article and derivative note | Repeat the same upstream argument | They are not treated as independent corroboration |
| Repository fixture | README claims automatic recovery; implementation needs operator action | The finding distinguishes marketing from observed/source-backed behavior |
| Transaction analogy | Suggests accepting dependent spec changes together | The proposal maps the useful relation and states where the analogy stops |
| Superficial analogy | Similar vocabulary but incompatible assumptions | Rejection has a causal reason rather than a taste judgment |
| Recipient cross-reference | An example contradicts a changed ownership rule | Integration review catches the inconsistency |

Begin with a manageable version to debug the workflow. Then scale the fixture beyond the chosen model's actual usable context, increasing relevant cross-source relationships as well as text volume. Record the context setting used. Do not hardcode a claim that a particular byte or word count exceeds every future model's window.

Keep expected facts, lineage, contradictions, and acceptance criteria outside the producer's read set. The producer must see the real recipient requirements, not a hidden alternative mission. Evaluate reasonable design alternatives with a rubric; avoid requiring one exact prose answer.

Run the current skill as a baseline. Save its real outputs, coverage evidence, resource observations, and interruption behavior. This establishes whether proposed machinery solves observed failures and how much overhead it introduces.

Exit criterion: a reproducible fixture and baseline receipt that exposes actual strengths and weaknesses. A favorable baseline is useful evidence for keeping the redesign smaller.

## 4. Second milestone: source structure and meaning

Extend intake instructions and the minimum supporting records. The representation must separate source identity from an occurrence of source content, and both from an interpretation. It must also preserve the original files or explicit locators to durable originals.

| Record | Minimum required information |
| --- | --- |
| Source | Stable ID, origin, type, original location, fingerprint/revision, acquisition outcome, parser/version if transformed |
| Unit | Stable ID, parent source, exact locator, heading or dialogue context, neighboring units, normalized-content identity |
| Occurrence/lineage | Origin, underlying content identity, parent or derivative relation when known, evidence for inferred relations |
| Coverage | Unit or bounded unit group, inspection depth, status, finding links, exclusion reason where applicable |
| Finding | Claim or mechanism, status, assumptions, source units, uncertainty, possible recipient relevance |

Do not require a separate file or heavyweight record for every sentence. Group related findings within a research unit while preserving locators for material claims. Use explicit records for decisions, mechanisms, exceptions, and relationships needed by later work.

Source intake and inspection require separate statuses. For example, a source may be acquired successfully but only structurally inventoried, or partially parsed and awaiting a better extraction. Adoption is a third dimension. Avoid a single overloaded `done` flag.

Handle exact duplication mechanically and semantic equivalence through explicit comparison. Treat unknown lineage as unknown. Preserve roles and branch-local assumptions in chat units. A handoff is a derived source whose claimed decisions may need corroboration.

Exit criterion: fixture source counts and lineage are correct; the late qualification and branch assumptions survive extraction; no source is silently lost or granted false authority.

## 5. Third milestone: recipient mapping and adaptation proposals

Add a compact recipient map linking to existing authoritative spec sections. Record goals, constraints, terminology, ownership, interfaces, decision status, and key scenarios. If the canonical spec lacks stable section IDs, create a sidecar mapping first; avoid an unrelated mass rewrite.

Use the research report's adaptation fields to move from evidence to proposals. Teach two discovery directions: recipient problem to candidate source mechanism, and source mechanism to possible recipient changes. Include a bounded exploration path for findings that do not fit the current map.

The transaction example should yield a native proposal such as “publish a consistent set of dependent spec revisions after checking their shared commitments.” Its acceptance scenario should reveal a partially updated section set. The proposal must explain the limits of mechanical semantic verification and compare a simpler manual checkpoint where that suffices.

Record concrete outcomes including already satisfied, rejected, deferred, and accepted. A speculative association is a candidate until examined. A valid proposal can modify the recipient map when the earlier conceptual boundaries prove unhelpful.

Exit criterion: a reviewer can reconstruct why an adaptation is useful, why its rejected alternative fails, which target sections it affects, and what observation would change the decision. A design endpoint labels all unexecuted tests as proposed validation.

## 6. Fourth milestone: coherent revision and cold recovery

Extend existing packets with the recipient input revision, relevant constraint IDs, source-unit IDs, branch assumptions, affected dependencies, output path, and stopping condition. Keep one owner for acceptance into shared records. A worker's proposal is not itself an accepted change to the canonical design.

Publish detailed records before updating the landing pointer. A checkpoint manifest identifies the accepted artifact set and fingerprints. If execution can stop between writes, recovery detects incomplete publication and reconciles the artifacts before accepting or replaying work. A generation number exposes stale work but does not stop an old process from writing.

Design integration should check the affected dependency neighborhood and relevant global commitments. Group circularly dependent choices into a joint reasoning packet when it fits. For larger coupled areas, define provisional boundary contracts, track unresolved assumptions, and iterate bounded neighborhoods with cross-boundary scenarios. Escalate persistent coupling into an architectural decision; an owner or a loop cannot guarantee convergence. Test a cross-cutting scenario through the resulting section set before acceptance.

Exercise these interruptions deliberately:

| Interruption | Recovery requirement |
| --- | --- |
| After source parsing | Reuse valid normalized artifacts; do not duplicate units |
| After a worker writes a result but before acceptance | Inspect the result and classify it as pending acceptance |
| After evidence changes | Reopen dependent findings and proposals, keeping unrelated ones reusable |
| After a recipient contract changes | Reject or reconcile a late worker result based on the old contract |
| During a checkpoint publication | Recover the last coherent accepted set and identify partial artifacts |
| Before the final report | Reconstruct completion status from evidence, not a remembered narrative |

Run a fresh reader with only the restart instruction and durable paths. It should identify the correct next action, pending uncertainties, and ownership without reconstructing the whole corpus. A subagent cold-read trial tests retrieval and state; a real fresh-session trial is also needed to test host continuation behavior.

Exit criterion: interruption tests preserve meaning and accepted work; the final analysis and plan are consistent across their referenced sections. Report untested recovery paths explicitly.

## 7. Fifth milestone: deterministic helpers where they pay off

Once the records have survived the fixture, add only the mechanics that reduce observed repetition or prevent concrete failures. Candidate helper capabilities are listed below; these are proposed interfaces, not existing commands.

| Capability | Inputs and outputs | Why it may be worth implementing |
| --- | --- | --- |
| Inventory and fingerprint | Scoped source paths to source manifest and acquisition issues | Stable identity and changed-source detection |
| Normalize supported inputs | Export/text/caption input to units with original locators | Repeatable parsing and preserved boundaries |
| Detect exact overlap | Content identities and ancestry to duplicate/occurrence records | Reduces repeated reading without semantic deletion |
| Query and pack | IDs/query plus budget to bounded excerpts and a pack manifest | Keeps worker context relevant and auditable |
| Validate references | Accepted records to explicit structural errors | Catches stale or dangling relationships before integration |
| Compute affected work | Changed IDs to dependency closure and pending rechecks | Supports incremental revision |
| Publish checkpoint | Accepted artifact set to manifest and landing pointer | Detectable partial publication and reproducible recovery |

Start with local text/Markdown, structured chat exports, and supplied caption files. Add fetching integrations based on actual availability and demand. Unsupported formats should produce explicit outcomes rather than a guessed parse. Inspect available libraries and repository patterns before choosing a parser or adding a runtime dependency.

Use narrow, finite tests for behavior that matters: shared-prefix identity, meaningful near-duplicate differences, missing parents, cue preservation, source-locator resolution, stale cache rejection, and interrupted publication. Avoid tests that merely assert copied instruction wording.

New checks should remain local to Borg and protect an identified producer or failure. This proposal does not call for repository-wide policy guards, background hooks, or a universal knowledge platform.

Exit criterion: the helpers improve the fixture's reliability or reduce measured repeated work. The installed skill can invoke its shipped dependencies without the repository's development environment.

## 8. Sixth milestone: resource-aware scheduling and optional retrieval

Discover capabilities once per environment: readable files, available parsers, source connectors, search methods, delegation, programmable model access, usable context information, and resource telemetry. Do not assume that access to interactive subagents implies an API for loops inside a script.

Record supplied hard limits separately from estimates and preferences. When a runner can enforce limits, use bounded dispatch, a reserve for integration/recovery, and a defined response to exhaustion. When limits are not observable or enforceable, state that the policy is advisory rather than manufacturing exact telemetry.

Use the following measurements to decide whether to expand infrastructure:

| Observed problem | Candidate experiment | Acceptance condition |
| --- | --- | --- |
| Exact search misses different vocabulary | Semantic retrieval alongside lexical search | Better recall at acceptable total processing cost |
| Useful evidence requires intermediate relationships | Explicit relation expansion or a graph backend | Better multi-hop evidence recovery without unacceptable noise |
| Many repeated extraction tasks | Scripted batching or DocETL/MOAR evaluation | Better end-to-end quality/cost including optimization overhead |
| Sequential independent research dominates elapsed time | Bounded subagents using shared records | Reduced latency or cost without weaker integration |
| Root repeatedly absorbs huge results | External result accumulation and bounded manifests | Smaller root context with evidence still accessible |
| Host supports real recursive model execution | A bounded RLM-style adapter | Improvement over ordinary packets under equal limits |

Begin with the smallest architecture that meets the fixture's quality floor. Compare extensions one at a time, retaining the same source corpus and endpoint. A cheap extraction pass must not filter out rare but important mechanisms without a measured coverage strategy.

Exit criterion: quality and resource receipts demonstrate the adopted extension's value. Keep the serial/file-based path for environments where optional services are unavailable.

## 9. Evaluation and release sequence

Run the repository's focused checks after each executable behavior change, followed by deterministic checks for only the affected plugin. At the appropriate checkpoints, the existing commands are:

```text
npm run test:contract -- --plugin opl-borg
npm run test:unit -- --plugin opl-borg
npm run eval:smoke -- --plugin opl-borg --skill assimilate
npm run test:installed -- --plugin opl-borg
```

The smoke command covers skill instructions and activation; the installed command verifies the packaged surface at a coherent checkpoint. Add MCP or UI checks only if the implementation actually introduces or changes those surfaces. No all-plugin reinstall or release-wide evaluation is required for a scoped Borg iteration. Follow [local plugin development](../local-plugin-development.md) for the full execution policy.

The larger corpus evaluation needs a separate bounded scenario runner or documented finite trial within existing testing conventions. Do not imply that today's selection-focused smoke cases exercise it. Keep an explicit model-call and resource allowance for that trial, and save actual artifact and usage receipts.

Initial fixture gates can demand no lost seeded critical constraints, correct known branch ancestry, resolvable citations for accepted material claims, detection of planted semantic conflicts, and correct interrupted-work recovery. These are finite test expectations, not a universal zero-error guarantee. Broader quality comparisons need repeated runs and reported variability.

Measure at least critical-fact recall, branch-status accuracy, provenance validity, conflict resolution, invalid analogy acceptance, plan dependency completeness, recovery rework, and total usage. Compare those with report quality and navigability. Keep both missed-value and unnecessary-complexity errors visible.

Any default change should be supported by the representative campaign, retain the current contained path, and describe its remaining limitations. Keep the active campaign's operating version fixed until a deliberate adoption checkpoint, as the current skill already requires for self-assimilation.

## 10. Delivery and retention

The first implementation increment should deliver the instruction/reference changes, the fixture and baseline, the minimum source/branch records, and a demonstrated analysis-to-plan campaign. It should also demonstrate a cold restart. This is a useful standalone improvement even if no vector database, graph service, or external agent runner is added.

Preserve necessary evidence, decisions, accepted mappings, and maintenance knowledge in the recipient's normal durable work area before cleaning temporary coordination. Retaining those materials for future evolution is an explicit product requirement for recurring assimilation. Disposable packets and logs remain eligible for the existing cleanup policy once no live owner needs them.

Verify retained evidence outside the cleanup target: exact supporting spans or durable revision-pinned artifacts, fingerprints, and usable locators. External URLs alone do not establish durability. If source restrictions prevent preserving sufficient evidence, retain and report that constraint instead of promising reproducible future verification.

The intended capability is cumulative design work: Borg can revisit why a choice was made, discover a better mechanism in newly supplied material, and revise the affected design without reconstructing everything or quietly breaking distant commitments. The evidence and acceptance contracts make that capability reviewable; the choice of orchestration engine remains replaceable.
