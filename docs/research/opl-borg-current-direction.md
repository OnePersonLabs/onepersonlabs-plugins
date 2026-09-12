# Borg: current direction

> **Ownership correction:** The active direction is a proposed `$projector-assimilate` skill developed in `C:/dev/projects/projector`. Most supplied design material concerns Projector. The modular synthesis trial now lives in Projector's separate `assimilation/` directory, with its own identities and lifecycle. Projector's accepted concept records remain separate, even when an assimilation file discusses those records. Preserve this Borg research as input; do not implement the Borg-centered roadmap as written. The trial still needs fidelity review. No new skill has been created.

Borg should maintain a coherent, evolving understanding of material supplied for a project. That understanding must remain usable when the original conversations, attachments, and browsing sessions are unavailable. Organize it by concepts and their relationships, with a small entry point and progressively disclosed detail. Preserve unresolved possibilities alongside settled understanding without turning every interesting proposal into a requirement.

This is the current working brief for the Borg redesign. It reconciles the desired everyday experience with the earlier research. It is not an implemented skill or a final schema. The [research report](opl-borg-large-corpus-assimilation.md) remains supporting analysis; the [earlier roadmap](opl-borg-large-corpus-roadmap.md) needs the lifecycle and output-contract adjustments described here before implementation.

## The experience to build

Supply chats, handoffs, transcripts, articles, repositories, or unfinished thoughts without first sorting them into a perfect brief. Borg organizes their meaning, connects useful mechanisms to the receiving project, preserves material differences, and develops candidate adaptations.

New material can arrive before earlier questions are answered. Unanswered questions remain unresolved; silence is not agreement. A later invocation without new material resumes useful work from the saved state. Ask a high-leverage question when a real user preference changes the consequential path; continue independent work where possible. Exact question timing can be refined through use.

The persistent conceptual workspace should be suitable for repository version control. Disposable execution records can retain their separate lifecycle. The current `.borg/` ignore and cleanup rules therefore cannot govern the only copy of enduring conceptual state.

A portable snapshot should contain an `INDEX.md` and linked Markdown files that explain the current conception without requiring old chats or attachments. Internal links provide progressive disclosure; external source links cannot substitute for necessary explanations. Exact citations or implementation baselines can remain when their identity matters, but source archaeology is not a prerequisite to ordinary reading.

## What must survive the transformation

Retain current meaning, concrete mechanisms, constraints, qualifications, live alternatives, open questions, and reasons that prevent repeating a consequential mistake. Honor actual revisions while resisting detail lost through accidental summarization.

For example, if one approach gains a useful capability but loses an essential property, preserve the resulting design obligation: future approaches must retain both. There is no need to retell who proposed or corrected each step.

“Lossless conceptual squash” is a fidelity objective, not a guarantee of perfect compression. Validate it against material distinctions and scenarios. Avoid preserving every speculative API or hypothetical number as a binding commitment merely because an earlier assistant wrote it confidently.

Keep evidence available behind the ordinary conceptual view when it serves later verification or reinterpretation. How much raw material belongs in Git can be decided when actual inputs expose storage or access constraints. That decision need not delay defining a self-contained conceptual output.

## Boundaries that keep the design coherent

- Borg remains a standalone plugin usable with different recipients, including Projector.
- The assimilation workspace holds developing understanding and proposals. It does not silently become a competing authoritative specification for a recipient that already has one.
- Organizing and evaluating incoming ideas does not by itself authorize implementation. Follow the endpoint supplied for the task.
- Concepts can have different task-relevant views. A view must carry the constraints needed for its purpose and indicate when more detail is necessary. Shorter prose alone does not establish sufficient context.
- Shared conversation ancestry should inform reconciliation without filling concept files with conversation identifiers or giving repeated ideas extra authority.
- Scripts, graph stores, context compilers, learned policies, and recursive runners remain candidate means. Each must earn its cost against simpler sufficient alternatives.

The recommended starting interface is the existing `$assimilate` skill. A second skill or fixed storage schema remains a design option, not an established requirement.

## A concrete example of the intended writing

The following is a small conceptual specimen, not a complete reduction of all supplied Projector material:

> **Work economics**
>
> Projector should choose the amount and timing of development work according to its expected contribution to the intended outcome and its total burden. Relevant burden includes usage quota, repeated context reconstruction, latency, retries, coordination, verification, integration, and maintenance. Additional effort is appropriate when its expected benefit justifies that burden.
>
> A useful intervention may be premature. Defer it with a meaningful condition for reconsideration when that condition is known. A small investigation may be valuable because it changes whether a much larger intervention is warranted. Reuse adequate existing evidence and keep the assessment itself proportionate.
>
> Required capability, authority, and correctness remain constraints. A cheaper result that omits required work is not an equivalent improvement. Missing measurements remain unknown, and hypothetical savings do not become observed benefits.
>
> The initial implementation recommendation is one governing policy applied by existing decision and execution owners. A dedicated economics engine, telemetry ledger, portfolio optimizer, or adaptive policy is optional and requires justification. Adaptive strategies must account for their own collection, tuning, and evaluation costs when compared with credible fixed strategies.
>
> Borg should honor a recipient's supplied effort policy while remaining independently usable. Sharing a repository or distribution channel with Projector does not establish shared runtime state or budget authority.
>
> **Unresolved:** the appropriate Projector integration points, available resource observations, and whether any adaptive mechanism provides sufficient benefit. These need recipient inspection or evaluation; no efficiency gain is established by this conceptual statement.

This form preserves the governing idea, important conditions, boundaries, and uncertainty. A reader can use it without reconstructing the conversation that produced it.

## One active path

**Goal:** an evolving, portable conceptual workspace that makes large assimilation manageable across interruptions.

**Verified:** the existing skill already supports bounded campaigns and recovery. The source-oriented handoff format adds conversational history to the working view. The old synthesis format requires one large output document. Those output and lifecycle assumptions do not satisfy the desired everyday experience.

**Active:** establish the output contract for a self-contained modular conception, using one existing handoff as the representative input.

**Done when:** a cold reader can recover its important commitments, mechanisms, alternatives, limitations, and next unresolved decision using only the resulting linked file set. Compare against the input to detect omissions; do not claim fidelity from readability alone.

**Parked:** full Projector synthesis, runtime implementation, exact directory and reference syntax, graph/embedding infrastructure, adaptive scheduling, and rewriting both reusable prompts. These remain available after the output contract is demonstrated.

Current result: the portable modular fileset has been drafted in Projector's isolated `assimilation/` directory. The Projector-facing change workflow is described there. Skill implementation and a full fidelity evaluation remain open.
