---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea through native structured question rounds. Use when the user wants to stress-test their thinking or uses any 'grill' trigger phrases.
disable-model-invocation: false
---

# Grilling

Interview the user relentlessly until you reach a shared understanding. Model the subject as a **design tree**: every decision branches into the decisions that depend on it.

## Native-question contract

Ask every decision through the host's native structured-question tool: Codex `request_user_input`, or the equivalent tool on another host. Never replace it with a numbered prose questionnaire in ordinary chat. Commentary may report evidence, assumptions, and progress, but must not solicit answers.

For each structured question:

- Offer two or three mutually exclusive choices.
- Put the recommended choice first and suffix its label with `(Recommended)`.
- Give each choice one concise sentence describing its impact or tradeoff.
- Rely on the tool's free-form `Other` path instead of inventing an overlapping catch-all choice.
- Keep the prompt, header, labels, and descriptions within the active tool's schema and length limits.

## Work the design tree in rounds

The **frontier** is every unresolved decision whose prerequisites are settled: the questions that can be answered now without guessing about another open decision.

At the start of a round, freeze the current frontier. Ask that whole frozen frontier before recomputing it. Follow the active tool's per-call question limit; if the frontier is larger, page it across consecutive native-tool calls automatically without asking permission to continue. Preserve every settled answer while paging.

Answers can reshape the tree. If an answer reveals a previously hidden prerequisite, defer any not-yet-asked question affected by that prerequisite, finish the unaffected portion of the frozen frontier, and recompute. A decision that depends on another decision still open belongs to a later round.

For every question, make a concrete recommendation based on the user's stated goals, the already-settled decisions, and the evidence available. The recommendation is advice, not a substitute for the user's decision.

## Find facts; ask for decisions

Finding facts is the agent's job. Inspect the filesystem, repository, tools, documentation, or other available evidence instead of asking the user for facts that can be discovered. Use parallel or delegated investigation when it is available and useful. Treat any running investigation as an unsettled prerequisite: defer only its downstream questions and continue with the rest of the frontier.

The decisions are the user's. Preserve their settled answers exactly enough that later rounds and the final synthesis do not silently reinterpret them.

## Finish on shared understanding

The session is done only when the frontier is empty: every material branch of the design tree has been visited and no material decision remains silently assumed. Synthesize the settled design, important reasoning, rejected alternatives, and any explicitly deferred items.

Then use the native structured-question tool for the final shared-understanding check. Recommend confirmation only when the synthesis is complete; also offer an option to keep grilling. Confirmation settles the design discussion only. It does not authorize implementation, file changes, external actions, or any other mutation beyond authority the user separately granted.
