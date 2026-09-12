# Reasoning across large corpora with OPL Borg

For the current product direction, start with [Borg: current direction](opl-borg-current-direction.md). This report supplies research and architectural options. The current brief clarifies the persistent, self-contained conceptual workspace and its distinction from temporary campaign coordination.

The strongest practical architecture for Borg is a persistent, evidence-backed design workspace with bounded reasoning over selected parts of it. It should preserve original material, maintain several useful ways to navigate that material, and revise the receiving design through explicit proposals and dependency-aware checks. The model's context becomes the workspace for the current question; the durable files hold everything needed to reconstruct and challenge its conclusions.

This is a recommendation for opl-borg, not an empirically established optimum. Research supports individual ingredients: external context processing, hierarchical retrieval, associative memory, incremental updates, and selective delegation. None of the studies reviewed establishes reliable, unlimited synthesis of an evolving architecture from arbitrary mixed sources. The integration and evaluation strategy therefore matter as much as the choice of memory technique.

The proposed endpoint is a coherent analysis and implementation plan, potentially spread across many files and larger than any one model response. An implemented assimilation can use the same foundation later. Output length is a consequence of justified detail; it is not a success metric.

The accompanying [implementation roadmap](opl-borg-large-corpus-roadmap.md) maps these recommendations to the repository and defines representative evaluations.

## 1. The problem has several independent dimensions

Increasing a context window helps with access to more material, but it does not by itself establish correct interpretation or coherent revision. *Lost in the Middle* demonstrated sensitivity to the position of relevant information in the models it evaluated. Its 2023 findings should motivate position-sensitive tests, rather than be treated as a measurement of every current model.[^1]

Borg must solve five related problems:

| Problem | Necessary capability | A misleading substitute |
| --- | --- | --- |
| Access | Locate and reopen original evidence at useful granularity | A summary that has lost its source |
| Interpretation | Recover claims, assumptions, causal mechanisms, and exceptions | A list of topics mentioned |
| Association | Find relationships across source vocabulary and domains | Only retrieving passages with similar wording |
| Revision | Change an existing design while respecting its commitments | Appending every appealing idea |
| Continuity | Recover accepted state, pending work, and uncertainty after interruption | Retelling the previous conversation |

There is also a difference between a sparse question and a dense task. Finding one known fact can require only a few retrieved passages. Identifying every material conflict across a corpus requires broader inspection. Discovering arbitrary interactions among all ideas can approach pairwise comparison cost. No index can guarantee that unseen text contains nothing important for an unspecified future question.

The useful analogy to human intellectual work is the combination of limited working memory, external notes, conceptual organization, and revisiting evidence. It is an engineering analogy, not a claim that a file-backed agent implements human cognition. The design should be judged by whether it preserves meaning and produces better decisions under interruptions and resource limits.

## 2. Research that changes the design

The following findings are narrower than the proposed architecture. Reported gains belong to the authors' workloads, models, baselines, and scoring methods. They are not comparable leaderboard scores for Borg.

| Work | Supported mechanism | Implication and limit for Borg |
| --- | --- | --- |
| Recursive Language Models, v3 | Keep long input and intermediate results in an external environment; programmatically inspect and process portions through recursive calls. Evaluations include inputs in the millions of tokens. | Strong evidence for externalizing both input and accumulated output. The authors identify exploding sub-call costs and underexplored natural tasks as limitations. A Markdown skill alone cannot supply the paper's execution environment.[^2] |
| RAPTOR | Retrieve original passages and recursive summaries at multiple levels of abstraction. | Useful for moving between detail and themes. A summary hierarchy is a retrieval aid; it does not establish that omitted detail is dispensable.[^3] |
| GraphRAG | Build entity relationships and community summaries to answer questions about an entire corpus. | Useful precedent for global thematic views. The paper evaluates query-focused sensemaking, not maintenance of a changing architecture.[^4] |
| HippoRAG 2 | Combine passages and graph relationships to improve associative retrieval and multi-hop QA. Earlier structured approaches can lose to dense retrieval outside their favored tasks. | Supports retrieving through intermediate relationships while retaining factual retrieval. Connecting existing facts does not demonstrate valid creative transfer between domains.[^5] |
| A-MEM | Maintain notes with contextual attributes and evolving links. | Supports revisable organization. Model-generated links and descriptions still need provenance and correction.[^6] |
| LongMemEval and LongMemEval-V2 | Test temporal reasoning, updates, multi-session memory, and much longer agent histories. | Good sources of evaluation dimensions. V2's prerecorded histories and QA tasks do not prove successful live design work.[^7][^8] |
| Agentic Context Engineering, v3 | Use structured incremental updates to address loss of detail during repeated context rewriting. | Supports patching specific knowledge records instead of repeatedly rewriting one master summary. Its playbook-adaptation results do not prove semantic consistency of a large spec.[^9] |
| Anthropic context engineering | Retrieve information as needed, keep structured notes, and select context appropriate to the next task. | Supports compact navigation and selective reading. This is practitioner guidance, not a universal optimal context policy.[^10] |
| Anthropic multi-agent research; Scaling Agent Systems, v3 | Delegation helps some decomposable tasks, while coordination cost and sequential dependencies can undermine it. | Delegate separable investigations and reviews. Keep coupled design decisions together. More agents is not a cost-saving assumption.[^11][^12] |
| DocETL and MOAR | Decompose and optimize semantic document-processing pipelines; evaluate quality and cost across alternative plans. | Consider an existing engine for repeated bulk processing. Optimizer runs also cost time and tokens, and require a meaningful evaluation function.[^13][^14] |

Two particularly relevant cautions follow. First, RLM v3 distinguishes actual programmatic recursive processing from merely giving an agent files and a delegation tool. It also accumulates output outside the root response. Borg can borrow those principles within host capabilities, but should not advertise an equivalent runtime without implementing and testing one.[^2]

Second, Anthropic's 2025 research-system account reports approximately 15 times the token use of ordinary chats in its multi-agent setting. This is not a universal multiplier or a comparison against an equally thorough single agent. It does establish why delegation must be evaluated by total work, including duplicated context and integration.[^11]

## 3. Existing Borg foundations and gaps

The repository's [current skill](../../plugins/opl-borg/skills/assimilate/SKILL.md) already makes several sound commitments. It investigates causal value, distinguishes claims from tested evidence, compares capabilities across donors, records explicit dispositions, and preserves the receiving system's coherence. It also explicitly considers resource costs. These principles should remain central.

[Campaign state](../../plugins/opl-borg/skills/assimilate/references/campaign-state.md) already specifies a small landing file, indexed coverage, source identities, decisions, work ownership, verification receipts, invalidation, and interruption recovery. [Orchestration](../../plugins/opl-borg/skills/assimilate/references/orchestration.md) already defines bounded packets, selective raw-source reading, cold handoff checks, and a serial fallback. The redesign should extend those mechanisms rather than create a competing campaign protocol.

The significant gaps are more specific:

| Current emphasis | Needed extension |
| --- | --- |
| Repositories and inspectable systems | Heterogeneous documents, transcripts, handoffs, and conversation exports |
| Source revision and coverage | Parse fidelity, overlapping excerpts, shared ancestry, and derived-source lineage |
| Capability records | Claims, assumptions, questions, alternatives, mechanisms, and explicit analogical mappings |
| Recipient entrypoints and tests | A map of a large specification's requirements, owners, definitions, scenarios, and dependencies |
| Comparison across donors | Retrieval from both recipient needs and newly discovered source mechanisms |
| Implementation verification | Design-level consistency and plan completeness without pretending implementation was tested |
| Qualitative resource judgment | Enforceable dispatch limits when a runtime is available; honest estimates otherwise |
| Temporary campaign cleanup | Explicit separation of disposable coordination from evidence retained for future design evolution |

The existing eight [smoke cases](../../tests/evals/cases/opl-borg.jsonl) test selection and explanations of workflow, including resume and cleanup. They do not demonstrate successful assimilation of a real corpus beyond a context window. That gap should determine the first serious experiment.

## 4. Memory should have several views and one recoverable evidential basis

Use four layers with different authority and lifetimes. They are information responsibilities, not a requirement to create four databases.

| Layer | Contents | Authority and lifetime |
| --- | --- | --- |
| Original evidence | Imported files, captures, conversation nodes, transcript cues, repository revision references | Preserved originals or verified durable copies with exact locators; never silently rewritten by synthesis |
| Derived understanding | Source digests, mechanism records, topic views, proposed relationships, conflict sets | Revisable interpretations with source links and generation/version information |
| Accepted design | Requirements, decisions, module contracts, scenarios, analysis and plan sections | Canonical only after the appropriate acceptance step; retains reasons and supersession history |
| Current work | Landing file, ready frontier, packets, active owners, budgets, handoff | Temporary coordination; detailed completed work moves out of the active view |

Markdown is a good human-readable representation. A small structured manifest is useful for facts that scripts must join reliably: IDs, parent relationships, hashes, paths, statuses, dependencies, and checkpoint membership. JSONL or JSON is sufficient initially. At larger scale, an optional SQLite index can accelerate queries, provided it is rebuildable from the canonical records. Avoid maintaining two independently editable sources of truth.

Keep the scheme proportional. A contained task can use one evidence table and a few decisions. A large campaign may use the following layout, creating files only when they have content:

```text
.borg/campaign/
  STATE.md                 current mission, frontier, limits, checkpoint
  HANDOFF.md               restart instructions when needed
  sources.jsonl            source identities, locations, provenance, parse status
  coverage.jsonl           bounded units, inspection depth, dispositions
  raw/                     campaign-owned captures when originals need preserving
  normalized/              derived text with locators back to originals
  indexes/                 source, topic, mechanism, recipient, and conflict views
  findings/                grouped evidence and mechanism records
  proposals/               candidate design changes and their evaluations
  work/                    packets, worker results, and receipts
  checkpoints/             manifests of coherent accepted generations
```

The recipient's canonical specification stays in its existing documentation area. It should not be copied into `.borg/` as another editable master. If the recipient is one giant document, first build a section map and use bounded excerpts. A later split should follow conceptual ownership and navigability needs, not an arbitrary token limit.

Indexes must themselves support progressive disclosure. A top-level index contains area descriptions, counts, exceptions, and links. It should not contain every claim. If an area index outgrows a useful read, split it by a stable responsibility or question. Supply headings, ID queries, and bounded excerpts so a reader need not load a whole large table.

A summary needs an explicit role: navigation, factual digest, unresolved-question map, or decision brief. It should identify its source units, important caveats, inspection depth, and version. Summaries can omit detail while the source remains accessible. They must not become the sole surviving record of a discarded caveat.

## 5. Ingest mixed sources without flattening their meaning

Start with cheap structural inventory, then perform a representative parse check. A successful download or a nonempty text file does not establish a faithful capture.

| Source type | Preserve | Check before analysis |
| --- | --- | --- |
| Chat export | Speaker, node/message IDs, parent links, ordering, attachments, branch identity, quoted material | Missing parents, duplicate prefixes, model responses mistaken for user commitments |
| Handoff | Authoring session if known, links, stated decisions, unresolved work, references to absent context | Whether claims of acceptance are supported by an original statement |
| YouTube transcript | Video identity, language, cue times, caption provenance, chapter boundaries | Missing spans, transcription ambiguity, meaning carried only by unseen demonstrations |
| Webpage | Original URL, capture time, title, body, headings, relevant tables or media references | Navigation pollution, truncated articles, lost tables, changed content |
| GitHub repository | Revision, relevant local modifications, files, symbols, dependencies, tests | README claims versus implementation, missing submodules or generated artifacts |
| Large specification | Existing authoritative location, section IDs, requirements, definitions, decisions | Conflicting versions, unexplained terminology changes, missing dependencies |

Use connectors and established extractors where available. Borg should consume their output through a common source manifest instead of becoming a universal downloader. Mark inaccessible sources and incomplete captures explicitly. A transcript can support statements about speech while leaving visual claims unverified.

Segment by meaning-bearing boundaries: a conversation exchange, an argument and qualification, a transcript passage, a document section, or a symbol with necessary callers. Large units can be subdivided, preserving a parent locator and enough neighboring context to resolve references. Tiny units can be packed together when the same question applies.

Chunking for retrieval and packing for reasoning are separate operations. A small addressable passage may be useful for search, while a worker should receive several connected passages plus their assumptions. There is no single universally optimal chunk size. Measure omissions and boundary errors on representative input.

For every normalized unit, preserve a stable identity and a resolvable location: original character range, message ID, cue range, or revision plus path and symbol. Retain the heading path and neighboring-unit references. Record normalization version and source fingerprint so a changed parser does not silently reuse incompatible offsets.

### Conversation ancestry and epistemic status

A branched conversation is naturally represented as a directed acyclic graph when parent information is available. An export may repeat the shared prefix in multiple files; a handoff may summarize that same prefix again. These are repeated representations of one history, not independent support for the ideas in it.

Consider a shared conversation that establishes: “Users must be able to edit while offline.” Branch A explores a hosted coordination service. Branch B explores local peer synchronization. Branch C explores dropping offline support for an early release. Unless the user adopts C, its exploration does not supersede the shared requirement. A later timestamp alone does not make one sibling branch authoritative.

The source representation should retain the common ancestor once, associate branch-specific assumptions with each branch, and link derived handoffs to the underlying discussion when known. Each substantive statement needs a status appropriate to its evidence: user constraint, user choice, explored option, assistant suggestion, reported fact, inference, open question, or superseded decision. Avoid inferring endorsement from an enthusiastic assistant response.

When ancestry is missing, record “relationship unknown.” Exact matching prefixes and known message IDs can establish duplication; textual similarity can suggest a relationship for review. Do not fabricate a branch graph from semantic resemblance. Imported conversations remain evidence about earlier intent until their relationship to current intent is resolved.

### Deduplication should reduce repeated work while preserving distinctions

Use a sequence of increasingly interpretive operations:

1. Identify exact original-byte duplicates using content hashes. Keep every origin in the provenance record even if storage is shared.
2. Detect repeated source units and known shared chat prefixes using structural identity. Retain each occurrence's branch and location.
3. Identify normalized-text matches and overlapping excerpts as candidates. Normalization can erase meaningful formatting, so preserve originals.
4. Compare near duplicates within plausible candidate groups. Examine changed negations, conditions, scope, version, confidence, and attribution.
5. Merge equivalent findings at the interpretation layer, attaching all supporting occurrences and retaining any exceptions.

Do not count a paper, an article paraphrasing it, and a chatbot repeating the article as three independent confirmations. Track their derivation when known; label independence unknown when it is not established.

Prune active attention more aggressively than evidence. “Excluded as unrelated,” “already satisfied,” “not yet inspected,” and “rejected after evaluation” are different states. An exclusion should include its scope and reason, so later changes in the mission can reopen the right material. Source deletion is a separate retention decision.

## 6. Retrieve relationships and discover possibilities

Before searching for improvements, build a compact map of the receiving design: goals, hard constraints, unresolved choices, major responsibilities, shared definitions, state ownership, interfaces, and representative end-to-end scenarios. Each entry links to its actual specification section. The map can be provisional where the design is unsettled.

Use several retrieval routes. Exact text and ID search are inexpensive and precise. Semantic retrieval helps when vocabulary differs. Explicit relationship traversal can connect a requirement to a dependency, mechanism, counterexample, or affected section. Topic summaries help ask corpus-wide questions. Search results should expose the route and original evidence, not just an opaque relevance score.

Contextual Retrieval provides evidence that giving an isolated chunk its specific document context can improve retrieval. Its published recipe includes model-generated context; for Borg, preserve a distinction between original passage and generated contextual annotation. Start with available headings and metadata, and pay for additional enrichment where missing context causes measured failures.[^15]

Run discovery in both directions. From the recipient, ask what source mechanisms could address a known problem. From a new source mechanism, ask which recipient assumptions, responsibilities, or scenarios it might improve or challenge. The second route protects against only finding evidence for the existing plan.

Reserve a bounded portion of exploration for material outside the current topic clusters: unusual mechanisms, minority views, negative cases, and unclassified sources. Revisit the recipient map when these findings suggest that its current categories are wrong. A knowledge structure that can only classify new material into old categories will entrench an early misunderstanding.

Preserve connected passages when extracting mechanisms. An atomized fact can lose the qualifications and relationships that make it meaningful. A useful mechanism record explains the problem, causal relationship, necessary assumptions, observed outcome, limitations, and supporting locations. It also carries the question it could change in the recipient.

### Turn analogy into an explicit, testable proposal

Structure-mapping research distinguishes relational correspondences from surface resemblance. It offers a useful model for looking across domains: identify how relationships correspond, then examine the inferences that mapping suggests.[^16] Borg can use that as a discipline for proposing adaptations, without assuming that an attractive analogy establishes correctness.

For example, material on database transactions could inspire a process for accepting revisions to a large spec. The relevant relationship is that several dependent changes should become visible together after validation. Candidate target elements are a proposal bundle, a pinned design revision, affected contracts, a validation result, and a checkpoint pointer. The target does not need to inherit a database server or every transaction property.

Test the mapping against a concrete case: a terminology change modifies an API section but leaves an example and migration plan using the old meaning. A staged bundle plus dependency checks may expose that inconsistency. However, natural-language semantic consistency cannot be made fully mechanical merely by calling a checkpoint a transaction. That is a boundary of the analogy.

For each material candidate, record:

| Field | Question answered |
| --- | --- |
| Recipient problem | What observable difficulty or unmet goal motivates a change? |
| Source mechanism and evidence | What relationship appears to cause the source's value? |
| Mapping | Which source roles and relationships correspond to target roles? |
| Preconditions and disanalogies | What must hold, and where does the analogy break? |
| Alternatives | How do unchanged behavior and a simpler sufficient adaptation compare? |
| Proposed native form | What changes in this recipient's own concepts and responsibilities? |
| Consequences | Which requirements, costs, interfaces, and neighboring sections change? |
| Discriminating scenario | What observation would favor, reject, or revise this proposal? |
| Disposition | Candidate, accepted, rejected, deferred, or superseded, with reasons |

Do not require every source to yield an adopted idea. A valuable result can be a strengthened rejection, a clarified boundary, a new question, or confirmation that the current design is already adequate. Judge proposals by benefit and fit, rather than the prestige of the source or novelty of the vocabulary.

## 7. Preserve global coherence through explicit dependencies

The hard part of a sprawling design is the information that crosses section boundaries. Modular writing only works when those relationships are represented well enough to revisit. Local correctness is insufficient if two sections disagree about identity, authority, failure behavior, or state ownership.

Maintain a compact view of global commitments and indexed relationships between requirements, decisions, contracts, and scenarios. Workers receive the commitments relevant to their task together with the affected neighborhood. Explicitly allow them to report missing dependencies and challenge the map. Its completeness is a hypothesis that must be tested.

Represent at least the relationships needed for decisions: supports, contradicts, depends on, refines, derived from, supersedes, affects, and analogous to. Distinguish a sourced relationship from an inferred one. Group strongly interdependent design areas for joint reasoning; splitting a cycle into nominally independent workers just relocates its complexity into integration.

If an interdependent area itself exceeds a usable context, partition it around provisional contracts. Record unresolved assumptions at each boundary, reason over bounded neighborhoods, and revisit affected areas when a contract changes. Use cross-boundary scenarios to challenge the partition. Track dependency density alongside document volume: a highly coupled design may require substantial iteration or architectural simplification, and no file layout guarantees convergence. Report unresolved coupling instead of claiming that an integration owner can hold an arbitrarily large cycle in mind.

A material revision proceeds through a bounded change set:

1. Read the relevant canonical sections, accepted decisions, evidence, and dependency neighborhood at a known revision.
2. Propose a specific change with affected section IDs, changed assumptions, reasons, and validation scenarios.
3. Check structural references and examine semantic effects on producers, consumers, examples, and end-to-end scenarios.
4. Resolve material conflicts. Reopen the proposal if evidence or recipient state changed during the work.
5. Publish the coherent accepted section set and decision record, then update its index and checkpoint manifest.

Use one integration owner per accepted boundary. Independent writers produce proposals or own disjoint drafts. They do not simultaneously rewrite a shared glossary or global index. If integration volume becomes too large, use area-level integration with explicit shared contracts and one final owner for cross-area decisions.

Changes should invalidate derived material through recorded dependencies. If a source qualification changes, revisit findings that depend on it, proposals based on those findings, and affected validation. If a recipient contract changes, revisit dependent plan slices even when source evidence remains valid. Keep unaffected records reusable, and distinguish stale from false.

Validation has two levels. Scripts can detect dangling IDs, contradictory status fields, missing declared dependency targets or required fields, stale fingerprints, unowned sections, or unresolved declared conflicts. Semantic reviewers must discover undeclared dependencies and examine whether the design behaves coherently in representative scenarios. Neither level alone proves all possible interactions, so final reports should state what was exercised and which uncertainties remain.

Periodically widen the frame through cross-cutting scenarios such as error recovery, cancellation, ownership transfer, migration, or offline operation. These reviews should follow a concrete scenario across multiple sections. Repeatedly asking an agent to “check overall coherence” from the same compressed summary is weak evidence.

## 8. Orchestrate around questions, evidence, and total cost

Use a work queue whose units answer a decision-relevant question or produce a verifiable artifact. Select a ready unit, assemble its bounded context, perform the work, inspect its result, update dependencies and remaining questions, and checkpoint. When a packet is too large, split it around a meaningful boundary and specify how its results join.

The packet extends Borg's existing contract with a recipient revision, evidence IDs, applicable branch assumptions, known contradictions, output limit, and a resource allowance when one is available. Workers should return a compact decision brief plus a path to the detailed result. The parent should not import their complete conversations.

Use scripts for mechanics: inventory, hashing, parsing supported formats, exact deduplication, locating spans, indexing IDs, assembling excerpts, validating references, calculating dependency closure, and recording checkpoints. Use models for interpretation, semantic comparison, analogy, conflict resolution, and architecture. A script should not implement a confident-looking semantic acceptance score without calibration.

Delegate when the question is sufficiently independent and the saved reading or elapsed time outweighs setup, duplicate context, and integration. A source specialist can continue on a related question while its context is useful. Change to a fresh context when the topic changes or irrelevant history dominates. Sequential execution of the same packets remains a supported mode.

Keep the coordinator's architecture work tightly coupled when choices influence each other. Comparative synthesis should bring competing mechanisms together, rather than let each donor specialist independently invent a whole target design. Independent evaluation is most useful for consequential proposals and integration scenarios, not as a ritual for every small note.

### Resource accounting

Track costs at the campaign level and by operation. Distinguish input tokens, generated tokens, cached input where observable, model calls, tool calls, elapsed time, and billed cost if exposed. Subscription usage percentages are account-level constraints; they are not necessarily convertible to exact task tokens or dollars. Unavailable values remain unknown.

An illustrative reading calculation shows why input sharing matters. Giving each of eight workers the same 120,000-token background consumes 960,000 input tokens before their unique evidence. Giving each 4,000 relevant background tokens consumes 32,000, provided that narrower context is sufficient. This is a 928,000-token difference in duplicated background, not a measured saving for a real campaign; output, tool results, retries, integration, and caching still count.

Estimate the cost of a candidate action as its direct processing plus expected retries and downstream review. Prioritize actions that can materially change a decision or resolve a blocking uncertainty. Use ordinal estimates if probabilities and monetary values cannot be justified. Do not create a separate elaborate cost model for cheap reversible operations.

Reuse an accepted result only when its relevant inputs remain compatible. A cache identity may include source content, unit IDs, question, extraction procedure, applicable recipient constraints, and model configuration where reproducibility requires it. Hash the relevant dependency set rather than invalidating every result whenever any recipient file changes.

Resource conservation should usually reduce redundant work before reducing inspection quality: deduplicate shared ancestry, batch related units, reuse accepted findings, avoid repeated full summaries, and skip unchanged checks. If the requested endpoint cannot fit the resource limit, retain a precise frontier and report the unfinished scope. Do not label uninspected material rejected in order to claim completion.

MOAR is a credible candidate for a repeated batch-processing component, because it searches for document pipelines with better quality/cost tradeoffs. Its current documentation says optimization runs multiple sample pipelines and can take tens of minutes. Benchmark its benefit over a simple script-plus-agent baseline before adopting the engine or paying for optimization on every new pile.[^14][^17]

### Bounded continuation and recovery

A repeated fresh-context loop can execute ready packets, but each iteration needs more than the original prompt. It must recover accepted artifacts, current ownership, incomplete attempts, limits, and an explicit next action. Anthropic's long-running-agent work provides a practical precedent for leaving recoverable state between incremental sessions.[^18]

Distinguish three boundaries: the context available to one call, resources available to the campaign, and whether the host can execute another turn at all. A skill cannot increase host limits or make a worker into a new root coordinator. A script cannot invoke subscription-backed model calls merely because the interactive assistant can delegate. Programmatic model recursion requires an actual supported API or host capability.

Before dispatch, leave enough capacity for result review, correction, and a recovery checkpoint. An optional external runner can enforce concurrency and spend limits; an instruction-only workflow can only follow observed limits and estimates. Record that difference in capability discovery.

A loop should stop because the endpoint is satisfied, a real dependency needs resolution, the resource allowance is exhausted, or further attempts are repeating the same failure without new evidence. A bounded retry changes the query, evidence, or decomposition. Producing more commentary is not measurable progress. Stopping for resources preserves an incomplete campaign; it does not redefine success.

## 9. Produce large analysis and plans as navigable artifacts

Do not force a many-context result through one final answer. Plan an output structure with stable section IDs, clear responsibilities, shared definitions, and explicit cross-references. Write and revise sections in bounded sets. Assemble a single exported document only if needed; the file set can remain the canonical deliverable.

Keep evidence analysis, accepted design, and delivery planning distinguishable. Analysis explains source mechanisms, alternatives, and uncertainty. Design states the selected form and its rationale. The plan identifies executable slices, dependencies, acceptance evidence, and unresolved decisions. A large body of interesting analysis does not imply that a plan is ready to execute.

For each plan slice, identify the outcome, target area, prerequisites, work boundaries, validation scenario, and completion condition. Where a design choice remains unresolved, create a decision task with evidence requirements rather than guessing implementation details. Cross-link repeated concepts instead of explaining them independently in every chapter.

Completion requires coverage accounting, not a claim that the prose feels comprehensive. Report total inventoried units, inspected units and depth, exclusions, unresolved questions, accepted proposals, and verification performed. Every required outcome should map to an accepted design section and an appropriate plan slice or explicit unresolved dependency.

The final coherence review should traverse major end-to-end scenarios and high-risk dependencies across the section set. It can itself be partitioned, with shared contracts and a coordinator reconciling conflicts. This reduces the need for one final all-document read, while acknowledging that undeclared dependencies can still escape review.

## 10. Evaluate the architecture through realistic failures

The first benchmark should be a small but adversarial corpus, followed by a scale variant that exceeds the tested model's usable context. Padding an otherwise trivial task with irrelevant text does not adequately test design synthesis.

Include shared chat ancestry, conflicting branch assumptions, repeated handoffs, a transcript with a crucial qualification, an article repeating an upstream source, a repository whose README overstates behavior, and a receiving spec with cross-section dependencies. Seed facts and relationships that are objectively checkable, while allowing several valid architectural answers.

| Evaluation dimension | Observable evidence |
| --- | --- |
| Coverage | Known relevant units accounted for; unread units remain explicitly unread |
| Meaning preservation | Negations, exceptions, branch assumptions, and minority mechanisms survive extraction |
| Provenance | Accepted claims resolve to actual spans; derived sources do not inflate independent support |
| Association | Valid mechanism transfer is distinguished from superficial analogy |
| Design coherence | Seeded cross-section conflicts are resolved without violating the recipient's constraints |
| Revision | Changed evidence reopens affected work and preserves unrelated accepted results |
| Recovery | A fresh context resumes the correct next action without duplicate accepted work |
| Economics | Total input/output usage, repetitions, latency, and any billing are reported with quality |
| Output scale | Multiple substantial sections remain mutually navigable and traceable |

Compare the current skill, a minimal version with structured source and branch records, and the version with selective retrieval and delegation. Add embeddings, graph retrieval, recursive execution, or an optimizer as separate experiments. Use the same corpus, endpoint, model settings where possible, and resource envelope. Measure savings at matched acceptable quality, rather than rewarding a cheaper run that silently skips difficult material.

Quality should combine deterministic checks with rubric-based judgment of actual artifacts. Blind the evaluator to the producing workflow where practical. Repeat nondeterministic comparisons enough to expose instability, and retain failures. An evaluator's favorable opinion is weaker than locating the cited evidence or executing the affected scenario.

These tests should also measure the cost of the bookkeeping. If creating and refreshing indexes consumes more effort than they save on the target workload, reduce the structure. Small tasks should retain the current direct path.

## 11. Recommended adoption sequence

Begin by extending the skill's information model and demonstrating one end-to-end mixed-corpus campaign. The first useful increment is structural source identity, branch-aware interpretation, a recipient map, explicit adaptation proposals, and a real cold-resume evaluation. Most of this can be expressed through concise instructions and a few supporting references.

Then add deterministic helpers where realistic input exposes repetitive mechanical work or failures. Establish stable records and clear ownership before adding optional semantic search. Adopt a heavier retrieval graph or document-processing runtime only when measured recall, repeated workload, or integration volume justifies it.

Keep methods replaceable. The same evidence records and proposal contracts should work with direct file search, a retrieval backend, serial packets, or delegated packets. An external execution engine can accelerate the work without becoming the definition of assimilation.

For repeated evolution of a large design, retain the evidence and rationale needed to revisit decisions in the recipient's normal durable area. Disposable packets and transient logs can still be cleaned up under the existing campaign policy. A temporary directory is appropriate for coordination; it is a poor sole home for knowledge the next assimilation is expected to reuse.

A URL or a remote commit identifier alone does not ensure future access. Before removing a campaign capture, verify that the retained record preserves the exact supporting spans or a durable revision-pinned artifact, its fingerprint, and usable locators outside disposable storage. Respect source access and retention constraints; if they prevent durable preservation, record the limitation and the consequence for future verification.

## Sources

Sources were checked on September 11, 2026. Versioned references identify the version used where relevant; unversioned project documentation can change. Architecture recommendations and illustrative examples in this report are analytical proposals, not results measured in opl-borg.

[^1]: Nelson F. Liu et al. [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172v3). 2023, v3 November 20, 2023; TACL.
[^2]: Alex L. Zhang, Tim Kraska, and Omar Khattab. [Recursive Language Models](https://arxiv.org/html/2512.24601v3). v3, May 11, 2026. Sections 2, 3, 7 and Appendix B.
[^3]: Parth Sarthi et al. [RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval](https://arxiv.org/html/2401.18059v1). 2024.
[^4]: Darren Edge et al. [From Local to Global: A Graph RAG Approach to Query-Focused Summarization](https://arxiv.org/html/2404.16130v2). First submitted 2024; v2, February 19, 2025.
[^5]: Bernal Jimenez Gutierrez et al. [From RAG to Memory: Non-Parametric Continual Learning for Large Language Models](https://arxiv.org/html/2502.14802v2). 2025. HippoRAG 2.
[^6]: Wujiang Xu et al. [A-MEM: Agentic Memory for LLM Agents](https://arxiv.org/html/2502.12110v1). 2025. The original design was inspected; the arXiv record also identifies later revisions.
[^7]: Di Wu et al. [LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory](https://arxiv.org/abs/2410.10813v2). First submitted October 2024; v2, March 4, 2025; ICLR 2025.
[^8]: Di Wu et al. [LongMemEval-V2: Evaluating Long-Term Agent Memory Toward Experienced Colleagues](https://arxiv.org/html/2605.12493v1). May 12, 2026.
[^9]: Qizheng Zhang et al. [Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models](https://arxiv.org/abs/2510.04618v3). v3, March 29, 2026; ICLR 2026.
[^10]: Anthropic Applied AI team. [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents). September 29, 2025.
[^11]: Anthropic. [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system). June 13, 2025.
[^12]: Yubin Kim et al. [Towards a Science of Scaling Agent Systems](https://arxiv.org/abs/2512.08296v3). v3, April 8, 2026.
[^13]: Shreya Shankar et al. [DocETL: Agentic Query Rewriting and Evaluation for Complex Document Processing](https://arxiv.org/abs/2410.12189). First submitted October 16, 2024; VLDB 2025.
[^14]: Lindsey Linxi Wei et al. [Multi-Objective Agentic Rewrites for Unstructured Data Processing](https://arxiv.org/abs/2512.02289v4). v4, April 1, 2026. MOAR.
[^15]: Anthropic. [Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval). September 19, 2024.
[^16]: Northwestern University Qualitative Reasoning Group. [Structure-Mapping: A Computational Model of Analogy and Similarity](https://www.qrg.northwestern.edu/ideas/smeidea.htm). Undated project account of Gentner's structure-mapping theory and the Structure-Mapping Engine.
[^17]: DocETL project. [Optimization overview](https://ucbepic.github.io/docetl/optimization/overview/). Current project documentation, accessed September 11, 2026.
[^18]: Anthropic. [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents). November 26, 2025.
