# OPL Sporkflow Architecture

Status: architecture baseline; implementation has not started
Date: 2026-08-27, America/Chicago
Repository baseline: `32c239eb6196313dde2ea37cf9de8921fc04cf72`

## Decision language

This document continues the semantic-megazord handoff without changing its
authority labels:

- **LOCKED** carries an explicit user decision from the handoff.
- **ARCHITECTURE DECISION** is the conclusion of this design pass. It is not a
  retroactive user requirement and can be superseded by stronger evidence.
- **CURRENT FACT** was revalidated against source, executable behavior, or
  official documentation on 2026-08-27.
- **IMPLEMENTATION LOCK** must be resolved against the implementation-time
  environment without reopening the architecture.

The ignored predecessor corpus under `.temp/predecessors/` remains governed by
`.temp/predecessors/MANIFEST.md`. In particular, no BSL-1.1 Caveman runtime
code may be copied into this implementation.

## Objective

**LOCKED:** Build one repository-selectable semantic and communication
operating system for Codex. Once enabled, it infers artifact, risk, audience,
semantic context, and composition state. A user does not select STE,
SimpleEnglish, Caveman, ubiquitous-language, domain-modeling, humanization,
writing-shape, writing-beats, or ontology modes.

The kernel owns semantic evidence, approved project meaning, alignment, bounded
projections, and communication policy. It does not absorb debugging, TDD,
review, specification lifecycle, research, browser automation, publishing,
media, personal knowledge management, or migration workflow authority.

## Decision summary

| Topic | Architecture decision |
| --- | --- |
| Product identity | **Sporkflow**, a semantic and communication kernel |
| Plugin identity | `opl-sporkflow`, displayed as **OPL Sporkflow** |
| CLI identity | `sporkflow` |
| Skill identity | `sporkflow`; the skill name itself has no `opl-` prefix |
| Tracked repository state | `.opl/sporkflow/` |
| Implementation | Rust core and CLI; versioned JSON wire contracts; optional provider sidecars |
| Shared IR | New provider-neutral semantic IR; Rust Atlas is a provider, not the IR |
| Agent Spec boundary | Optional down-projection adapter; Agent Spec retains KLL, Task Contract, lifecycle, and fallback authority |
| Parsing | Pinned Tree-sitter syntax baseline, format-native parsers, optional compiler/native providers, freshness-matched existing SCIP |
| Persistent cache | Immutable content-addressed objects plus a SQLite control plane under the platform cache directory on a verified filesystem |
| Project contract | Human-edited TOML at `.opl/sporkflow/contract.toml`; candidates and inferred facts never write it |
| Activation | Tracked config plus machine-local tri-state override; override wins; absent both means off |
| Codex surface | One model-invoked skill and one plugin hook dispatcher; no global `AGENTS.md` mutation |
| Query surface | Bounded CLI JSON/text projections with receipts and continuations |
| MCP | Deferred from v1; add only if evaluation shows value beyond the CLI contract |
| Index execution | Existing matching semantic indexes may be read automatically; generating an index or invoking build tooling requires explicit authorization |
| Publication | The kernel can gate copy but cannot publish, schedule, select an account, or supply human approval |

### Naming and namespace ownership

**ARCHITECTURE DECISION:** `Sporkflow` is the one memorable product word. It is
a play on "some person's workflow," connecting OnePerson Labs to the way one
person keeps a project's meaning, architecture, claims, and communication
coherent. It also evokes a spork: one compact instrument serving several
related jobs, without presenting those jobs as user-selected modes.

| Surface | Namespace |
| --- | --- |
| Product and human-facing name | `Sporkflow` |
| Executable | `sporkflow` |
| Plugin package and repository folder | `opl-sporkflow` |
| Skill folder and frontmatter `name` | `sporkflow` |
| Qualified catalog ownership, when Codex displays it | `opl-sporkflow:sporkflow` |
| Tracked project state | `.opl/sporkflow/` |
| Rust package family | `sporkflow-*` |
| Wire schemas and authority domains | `sporkflow/...` and `sporkflow:...` |
| Platform config, cache, state, and rollback directories | `sporkflow/` |

The required `opl-` prefix belongs only to the distributable plugin package.
It is not copied into the CLI or the skill's own name. There is no compatibility
alias because no implementation or released namespace exists yet.

## System boundary

```text
repository bytes       approved contract       trusted external evidence
       |                       |                            |
       v                       v                            v
syntax / format / semantic providers       contract and evidence loaders
       |                       |                            |
       +-----------------------+----------------------------+
                               |
                               v
                   provider-neutral semantic IR
                     assertions + exact evidence
                               |
                    alignment and drift resolver
                               |
           +-------------------+--------------------+
           |                   |                    |
           v                   v                    v
      bounded queries    communication policy   consumer adapters
   explain/flow/impact   audience/composition   Agent Spec/Nyx/Matt
```

The core dependency direction is one-way. In this diagram, `A -> B` means
`A` depends on `B`:

```text
sporkflow-protocol -> sporkflow-ir
sporkflow-provider-sdk -> sporkflow-protocol
sporkflow-store -> sporkflow-ir
sporkflow-repository -> sporkflow-ir
sporkflow-providers -> sporkflow-provider-sdk + sporkflow-ir + sporkflow-repository
sporkflow-resolver -> sporkflow-ir + sporkflow-store
sporkflow-policy -> sporkflow-ir + sporkflow-resolver
sporkflow-query -> sporkflow-ir + sporkflow-store + sporkflow-resolver + sporkflow-policy
sporkflow-cli -> every kernel crate above             # composition root

rust-atlas-provider -> rust-atlas + sporkflow-provider-sdk
Agent Spec adapter -> sporkflow-cli JSON schema + existing Agent Spec contracts
```

The kernel does not depend on Agent Spec's KLL or lifecycle crates. Agent Spec
does not need the kernel to operate. This prevents a cycle in which approved
requirements become derived graph facts and those facts then validate the same
requirements. Crate direction alone is insufficient to prevent a data cycle;
the provenance-taint and projection rules below enforce that boundary.

## Package boundary

**ARCHITECTURE DECISION:** Add one plugin at
`plugins/opl-sporkflow/` only after this architecture passes review. Its
source layout will be:

```text
plugins/opl-sporkflow/
  .codex-plugin/plugin.json
  hooks/hooks.json
  hooks/dispatch.sh
  hooks/dispatch.ps1
  skills/sporkflow/
    SKILL.md
    agents/openai.yaml
    references/
  crates/
    sporkflow-protocol/
    sporkflow-ir/
    sporkflow-provider-sdk/
    sporkflow-store/
    sporkflow-repository/
    sporkflow-providers/
    sporkflow-resolver/
    sporkflow-policy/
    sporkflow-query/
    sporkflow-cli/
  schemas/
  tests/
  THIRD_PARTY_NOTICES.md
```

`sporkflow-ir` owns entity and assertion meaning and has no parser, storage,
Codex, or Agent Spec dependency. `sporkflow-protocol` owns strict versioned wire
DTOs and conversions to the IR. `sporkflow-provider-sdk` owns bounded external
process behavior. `sporkflow-store` owns immutable objects, snapshots, receipts,
leases, and atomic publication. Providers return candidate layers to the CLI
composition root; they cannot mutate approved truth or publish directly. The
CLI validates the complete candidate, asks the store to publish it, invokes the
resolver, and serves queries over one pinned snapshot.

The kernel project owns and versions these crates independently under SemVer.
v1 consumers use the CLI JSON schema, not path dependencies or cache internals.
The Rust Atlas adapter pins a released `rust-atlas` crate version. Agent Spec
does not depend on a kernel crate in v1. A later extraction of generic snapshot
mechanics into `sporkflow-store` may be adopted by Rust Atlas only after a
separate compatibility release and equivalence suite; it is not required for
kernel v1 and cannot create a cross-plugin runtime-path dependency.

Release packages contain host binaries selected by thin POSIX and PowerShell
launchers. Local marketplace development may build those binaries before
plugin installation; installation must not depend on package lifecycle
scripts. `hooks.json` uses `command` for POSIX and the documented
`commandWindows` override for native Windows. The release matrix must include
the Codex-supported Linux, macOS, and Windows targets chosen at implementation
time. WSL uses the Linux binary and native WSL cache paths, not `/mnt/c`.

## Authority model

### Epistemic vector

The handoff's statuses are important but not a valid linear promotion ladder.
For example, approved intent and runtime observation are different dimensions,
not stronger versions of one another.

**ARCHITECTURE DECISION:** Every assertion and relation carries this epistemic
vector:

| Field | Values | Meaning |
| --- | --- | --- |
| `origin` | `observed`, `declared`, `inferred`, `approved` | Where the assertion's meaning came from |
| `resolution` | `not-applicable`, `syntax-only`, `possible`, `bound`, `observed-runtime` | How strongly a reference or behavior is resolved |
| `validation` | `unchecked`, `validated`, `contradicted`, `unknown` | Whether independent evidence checks it |
| `confidence` | `exact`, `high`, `medium`, `low` | Qualitative confidence with a required basis |

This maps the handoff vocabulary without erasing orthogonal state:

- Observed and declared evidence use the matching `origin`.
- Bound and possible are `resolution` values.
- Inferred and approved are distinct `origin` values.
- Validated is a `validation` value and never replaces origin.
- Observed runtime is reserved for actual execution evidence.

There is no generic `promote()` operation. Each transition is a new assertion
with its own provenance. Contradictory assertions can coexist and are exposed
as a conflict; the store never overwrites one with the other.

### Approval boundary

**LOCKED:** Inferred implementation patterns never silently become approved
project truth.

Only these routes create `origin = approved` assertions:

1. A fact in `.opl/sporkflow/contract.toml`.
2. An explicit user approval or correction applied through the contract
   mutation command.
3. A tracked authoritative document explicitly named by the contract policy.

Approval is an acyclic two-record construction. First, canonicalize the
proposed assertion without `id` or `approval_event` and hash those complete
bytes as `approved_payload_blake3`. Then construct one approval event without
its `id`, encode that complete record as canonical CBOR, and derive the event
ID as `approval-event:` plus its BLAKE3 digest:

```json
{
  "id": "approval-event:<blake3>",
  "identity_scheme": "sporkflow/approval-event/v1",
  "route": "contract|explicit-user|authoritative-document",
  "source": "evidence:<blake3>",
  "approved_payload_blake3": "<blake3>",
  "contract_before_blake3": "<blake3-or-null>",
  "contract_after_blake3": "<blake3>",
  "change_blake3": "<blake3-or-null>",
  "policy_entry": "<optional-contract-policy-id>",
  "request_fingerprint": "<optional-session-request-blake3>",
  "supersedes": []
}
```

The displayed `id` is attached only after hashing and is never in its own
preimage. Finally, add `approval_event` to the assertion and compute the
assertion ID.
The event never contains the resulting assertion ID, so both IDs are
deterministic and no hash cycle exists. The strict assertion schema requires
exactly one `approval_event` when `origin = approved` and forbids it for every
other origin. Each event is snapshot-scoped to exactly one reverse-referencing
assertion; unreferenced, multiply referenced, payload-mismatched, or
source-missing events reject the snapshot.

The record stores no invented person identity. The route-specific validator
requires an exact contract span and content fingerprint for `contract`, an
allowlisted deterministic parser and matching policy entry for
`authoritative-document`, and before/after contract fingerprints, exact change
digest, and current-request fingerprint for `explicit-user`. Supersession may
reference only assertions in the pinned base or the same validated candidate.
`explicit-user` is valid only when the mutation receipt binds the exact
proposed diff to the current user request. Durable approved meaning is written
into the tracked contract; a session receipt alone is not durable project
truth.

The published JSON Schemas include the conditional approved-assertion and
approval-event shapes. Golden fixtures compute the approved-payload digest,
compute the approval-event ID from canonical CBOR excluding only its `id`, then
compute the assertion ID in that exact order. They cover all three routes,
altered payloads, orphan events, missing requests, invalid policies, and
supersession references.

The third route retains the exact document span and the policy entry that
delegated authority. Deterministically structured statements may become
approved facts. A model interpretation of free prose remains inferred unless
the user accepts the proposed fact.

Providers, hooks, resolvers, query commands, model suggestions, repetition in
code, and generated summaries cannot write the contract. Contract mutation is
not available to the implicit path unless the user's current request explicitly
asks to approve, correct, add, deprecate, or otherwise change project meaning.

Approved sources can disagree. The kernel does not resolve that disagreement
by source order, file order, repetition, or model preference. Equivalent facts
coalesce while retaining all evidence. Conflicting approved facts require an
explicit `supersedes` relation or user resolution; relevant definitive queries
return `blocked-authority-conflict` until then.

### Provenance taint and anti-cycle rule

Every root evidence record carries an `authority_domains` set such as
`sporkflow:contract`, `agent-spec:kll`, `agent-spec:task-contract`,
`agent-spec:lifecycle`, `openspec:change`, `repository:source`,
`repository:test`, or `runtime:trace`. Every derived assertion carries the
union of all transitive source domains and root evidence IDs. Transformation,
model inference, validation, caching, and projection cannot remove a taint.

Each consumer query declares `consumer`, `purpose`, an assertion allowlist,
and denied authority domains. A result cannot be used as evidence for an
authority domain present in its transitive provenance. In particular:

- Agent Spec authoring may read approved domain terms as vocabulary, but they
  do not satisfy requirements.
- Agent Spec verification accepts only allowlisted independent code, test, and
  runtime evidence. It rejects assertions tainted by KLL, Task Contracts,
  lifecycle outputs, Agent Spec-generated docs, or any assertion derived from
  them.
- OpenSpec and other future adapters apply the same no-self-evidence rule.

The projection receipt lists included and rejected authority domains, rejected
assertion IDs, and the governing purpose policy. A required assertion rejected
for a cycle blocks the projection. Tests include KLL -> configured authoritative
document -> approved assertion -> Agent Spec verification and equivalent
multi-hop/model/cache routes; every route must remain rejected.

### Alignment, not truth merging

The resolver compares approved assertions with observed, declared, bound, and
runtime assertions. It emits separate alignment assertions:

- `aligned-with`
- `term-drift`
- `invariant-drift`
- `boundary-drift`
- `insufficient-evidence`
- `conflicts-with`

It never edits either side. A code rename can resolve observed drift; it cannot
rewrite the approved concept. A contract change can supersede old approved
meaning; it must preserve the old source and explicit supersession edge.

## Semantic IR

### Identity

IDs are opaque, namespaced strings whose derivation scheme is versioned. Human
names are attributes and may change. Cross-provider joins never rely on two
strings looking alike.

Examples:

```text
artifact:example:src/billing/subscriber.rs
rust:example:crate::billing::Subscriber
context:example:billing
concept:example:subscriber
term:example:billing:subscriber
invariant:example:subscription-has-one-subscriber
claim:example:release-2026-08-throughput
```

A path is not a universal identity for a symbol. A symbol is not a domain
concept. Alignment between them is an assertion with evidence.

The v1 identity tuples are:

| Entity | Canonical tuple and relocation behavior |
| --- | --- |
| Approved contract entity | `(schema-major, project-id, kind, explicit-id)`; stable across clones and moves |
| Artifact | `(schema-major, project-id, normalized-repository-path)`; a rename creates a new ID plus an evidence-backed `renamed-from` assertion |
| Bound compiler/SCIP symbol | `(identity-scheme, project-id, provider-namespace, language, producer-stable-symbol)` |
| Syntax-only symbol | `(identity-scheme, provider-namespace, artifact-id, enclosing-id, kind, declaration-anchor-hash, ordinal-among-identical-anchors)` |
| Assertion, evidence, or approval event | Versioned kind prefix plus BLAKE3 of canonical CBOR for the complete record excluding only its `id` |

`project-id` is an explicit, globally unique UUID URN in the tracked config and
does not contain a local path; `contract init` generates it, while a separate
project label remains human-readable. Clones retain it deliberately. If an
unrelated repository copies it, repository registration blocks until the user
chooses clone/fork continuity or runs an explicit rekey migration.

Repository paths use Git's root-relative byte path with `/` separators, no case
folding or Unicode normalization, and percent encoding for bytes that are not
valid UTF-8. The repository adapter records the reversible native path mapping.
`identity-scheme` changes when an algorithm changes, independently of the
provider software version. A digest collision is checked against the stored
canonical preimage and is a blocking invariant failure. Rename reconciliation
may propose `same-as` or `renamed-from`, but syntax similarity never merges IDs
automatically. Contract entities and observed symbols become related only by
an evidence-bearing assertion.

### Entities

The v1 core entity kinds are:

| Family | Kinds |
| --- | --- |
| Repository | `repository`, `worktree`, `snapshot`, `artifact`, `embedded-region` |
| Code | `symbol`, `module`, `type`, `callable`, `field`, `endpoint` |
| Documents and configuration | `document-section`, `configuration-item`, `schema-item` |
| Automation | `job`, `step`, `command`, `environment-variable`, `program` |
| Domain | `bounded-context`, `concept`, `term`, `invariant`, `boundary-rule`, `decision` |
| Communication | `claim`, `source-anchor`, `audience`, `prerequisite`, `composition-block`, `untouchable` |

Providers may add namespaced facets such as `rust:trait` or `github:workflow`
without expanding the core enum. A new core kind requires schema-version review
and cross-provider meaning; it is not added merely because one parser exposes
a syntax node.

The canonical entity shape is:

```json
{
  "id": "concept:example:subscriber",
  "kind": "concept",
  "display_name": "Subscriber",
  "identity_scheme": "sporkflow/contract-entity/v1",
  "facets": {
    "sporkflow:context": "context:example:billing"
  }
}
```

Facet keys are namespaced. Facet values are descriptive attributes, not hidden
assertions; anything that can affect a verdict, alignment, traversal, or query
must be an evidence-bearing assertion.

### Assertions and edges

An edge is an assertion whose object is another entity. A fact with a literal
value uses the same structure. The canonical v1 shape is:

```json
{
  "id": "assertion:<blake3>",
  "subject": "rust:crate::billing::CustomerService",
  "predicate": "sporkflow:uses-term",
  "object": { "entity": "term:example:billing:customer" },
  "epistemic": {
    "origin": "observed",
    "resolution": "syntax-only",
    "validation": "unchecked",
    "confidence": "exact"
  },
  "evidence": ["evidence:<blake3>"],
  "authority_domains": ["repository:source"],
  "producer": {
    "id": "tree-sitter-rust",
    "version": "<pinned>",
    "rule": "rust.identifier.reference"
  },
  "configuration": "config:<blake3>",
  "limitations": ["syntax does not bind this reference"]
}
```

Unknown fields fail strict wire deserialization. Provider-native payloads are
validated completely, canonicalized, and then projected into this IR. A
partial or oversized response cannot publish an empty fresh layer.

`object` is a strict union of `{ "entity": "<id>" }` and
`{ "literal": { "type": "string|integer|decimal|boolean|datetime|bytes",
"value": <typed-value>, "unit": "<optional-approved-unit>" } }`. Floats are
not canonical assertion values. Decimal and datetime lexical forms are
normalized by the schema.

The shape also has a conditional `approval_event` field. It is required only
for `origin = approved`, participates in the assertion hash, and is validated
by the acyclic construction in the approval-boundary section.

### Evidence and spans

Every assertion that can influence a result has at least one evidence record.
An evidence record includes:

- source kind: repository bytes, Git object, approved contract, external
  artifact, runtime trace, test, benchmark, or user approval;
- repository and worktree identity when applicable;
- repository-relative path or external URI;
- content BLAKE3;
- canonical zero-based half-open UTF-8 byte range;
- producer-native range and coordinate system;
- producer ID and version;
- rule ID and evidence basis;
- extraction configuration identity;
- freshness layer and state;
- privacy classification;
- transitive root evidence IDs and authority-domain taints;
- limitations and ambiguity candidates.

Canonical byte ranges are computed against the exact hashed bytes. Line and
column views are derived. Unicode normalization is never used to change source
coordinates. Embedded-language evidence stores both the outer span and the
inner provider's native span.

The canonical evidence shape is:

```json
{
  "id": "evidence:<blake3>",
  "source": {
    "kind": "repository-bytes",
    "repository": "repo:<project-id>",
    "worktree": "worktree:<blake3>",
    "path": "src/billing/service.rs",
    "content_blake3": "<blake3>",
    "byte_basis": "worktree"
  },
  "span": {
    "utf8_byte_start": 120,
    "utf8_byte_end": 135,
    "native": {
      "system": "tree-sitter-point-v1",
      "start": [8, 4],
      "end": [8, 19]
    }
  },
  "producer": {
    "id": "tree-sitter-rust",
    "version": "<pinned>",
    "rule": "rust.identifier.reference",
    "basis": "exact-token"
  },
  "configuration": "config:<blake3>",
  "freshness": { "layer": "syntax:rust", "state": "fresh" },
  "privacy": "repository",
  "authority_domains": ["repository:source"],
  "root_evidence": [],
  "limitations": ["syntax does not bind this reference"],
  "candidates": []
}
```

Layer freshness is one of `fresh`, `stale`, `partial`, `unavailable`, or
`unknown`. `root_evidence` is empty only on a root record; derived evidence
names every transitive root.

### Domain records

The tracked contract uses TOML because it has a strict mature parser, stable
string behavior, readable diffs, and fewer implicit-typing hazards than YAML.
Its initial shape is:

```toml
schema = "sporkflow/contract/v1"
project_id = "urn:uuid:0198e3c7-3a28-7f21-8db4-4e5c9120f741"
project_label = "example"

[[contexts]]
id = "billing"
name = "Billing"
definition = "Owns subscriptions and charges."

[[concepts]]
id = "subscriber"
context = "billing"
name = "Subscriber"
definition = "The party billed for exactly one subscription identity."

[[terms]]
id = "billing-subscriber"
context = "billing"
concept = "subscriber"
text = "Subscriber"
status = "canonical"

[[terms]]
id = "billing-customer"
context = "billing"
concept = "subscriber"
text = "Customer"
status = "deprecated"
replacement = "billing-subscriber"

[[invariants]]
id = "subscription-has-one-subscriber"
contexts = ["billing"]
statement = "Every Subscription belongs to exactly one Subscriber."
severity = "required"

[[boundaries]]
id = "billing-does-not-import-identity-user"
from = "billing"
to = "identity"
relation = "may-use-identifier-only"
statement = "Billing may consume an Identity identifier, not its User representation."

[[context_relationships]]
id = "billing-consumes-identity-id"
from = "billing"
to = "identity"
relationship = "customer-supplier"
upstream = "identity"

[[bindings]]
id = "subscriber-rust-type"
subject = "concept:subscriber"
relation = "represented-by"
selector_kind = "bound-symbol"
selector = "rust:crate::billing::Subscriber"

[[decisions]]
id = "adr-004-billing-identity-boundary"
path = "docs/adr/004-billing-identity-boundary.md"
status = "accepted"
```

IDs are unique and references must resolve. Terms are context-scoped, so the
same spelling can name different concepts without becoming an alias. A
deprecated term requires a replacement or an explicit `replacement = "none"`
reason. Invariants and boundaries require natural-language statements because
not all semantics are mechanically executable; optional machine-checkable
bindings are separate evidence-bearing rules.

An optional `supersedes = ["<entity-or-assertion-id>"]` field records explicit
replacement. Context relationships express ownership and direction separately
from allowed dependency boundaries. Bindings are approved expectations about
implementation identity; a failed or ambiguous selector produces drift and
does not retarget itself to a similarly named symbol.

Routine glossary edits do not create ADRs. A decision record is appropriate
only for durable, hard-to-reverse decisions or load-bearing rejected
alternatives.

### Claims

A claim record contains:

- stable claim ID and exact semantic payload;
- `claimed` or `not-claimed` boundary;
- status facets for proof, implementation, benchmark, production, and
  independent verification;
- repository or external source anchors;
- numeric and time-sensitive fields with freshness requirements;
- intended visibility: private, internal, or public;
- contradiction, omission, and leakage diagnostics.

The canonical claim shape is:

```json
{
  "id": "claim:release-2026-08-throughput",
  "payload": "The indexed query completes in under 150 ms at p95.",
  "boundary": "claimed",
  "status": {
    "proof": "not-claimed",
    "implementation": "implemented",
    "benchmark": "measured",
    "production": "not-claimed",
    "verification": "self-verified"
  },
  "anchors": ["evidence:<blake3>"],
  "values": [
    { "literal": "150", "unit": "ms", "qualifier": "p95" }
  ],
  "freshness": { "kind": "time-sensitive", "max_age_seconds": 604800 },
  "visibility": "public",
  "untouchables": ["150", "ms", "p95", "not production-validated"]
}
```

Each status facet uses a closed schema that preserves `not-claimed` separately
from unknown, absent, failed, and positive states. A status cannot be inferred
from the presence of another facet.

Style transformation operates on a claim ledger captured before rewriting.
The post-transform gate must account for every claim, number, qualifier,
negation, status, and source anchor. Missing evidence is reported; it is never
invented. The kernel returns `BLOCK`, `WARN`, or `OK`. It never sends the copy.

### Audience and composition

Audience and composition records are projections, not approved domain truth.
They are keyed by artifact content and task identity.

An audience record contains the intended audience, assumed concepts, required
prerequisites, allowed unexplained terms, risk, and evidence for the inference.
An inference with no user or artifact evidence remains low confidence.

```json
{
  "id": "audience:<blake3>",
  "artifact": "artifact:example:docs/operations.md",
  "label": "on-call engineer",
  "assumed_concepts": ["concept:example:deployment"],
  "required_prerequisites": ["prerequisite:<blake3>"],
  "allowed_terms": ["term:example:operations:rollout"],
  "risk": "high",
  "epistemic": {
    "origin": "inferred",
    "resolution": "not-applicable",
    "validation": "unchecked",
    "confidence": "medium"
  },
  "evidence": ["evidence:<blake3>"]
}
```

A composition record contains:

- state: `raw`, `exploring`, `committed`, `grounded`, `sequenced`, `revised`,
  or `complete`;
- source content hash and user-edit generation;
- concept nodes and prerequisite edges;
- blocks with purpose, required concepts, source anchors, and untouchables;
- selected order and omitted source fragments with reasons.

```json
{
  "id": "composition:<blake3>",
  "artifact": "artifact:example:docs/operations.md",
  "source_content_blake3": "<blake3>",
  "user_edit_generation": 4,
  "state": "sequenced",
  "concepts": ["concept:example:deployment"],
  "prerequisite_edges": ["assertion:<blake3>"],
  "blocks": [
    {
      "id": "composition-block:<blake3>",
      "purpose": "establish rollback precondition",
      "requires": ["concept:example:deployment"],
      "anchors": ["evidence:<blake3>"],
      "untouchables": ["command:example:rollback"],
      "order": 1
    }
  ],
  "omissions": [
    { "source": "evidence:<blake3>", "reason": "outside reader journey" }
  ]
}
```

Any user edit changes the content hash and invalidates later cached composition
states immediately. A prerequisite cannot silently appear after its consumer.
The artifact stops when the reader journey is complete, not when every input
fragment has been consumed.

## Repository contract and activation

### Tracked layout

```text
.opl/sporkflow/
  config.toml
  contract.toml
  decisions/              # optional project-owned ADR location
```

Generated graphs, candidates, receipts, caches, and session notes do not live
in this directory. The directory is project intent, not runtime state.

The v1 tracked config is:

```toml
schema = "sporkflow/config/v1"
project_id = "urn:uuid:0198e3c7-3a28-7f21-8db4-4e5c9120f741"
enabled = true
contract = "contract.toml"

[analysis]
mode = "safe"
include = []
exclude = []
existing_semantic_indexes = "matching-only"

[[authority.documents]]
id = "architecture-decisions"
path = "docs/adr/*.md"
role = "approved-decisions"
parser = "adr-frontmatter-v1"

[guards]
strict_procedure_globs = []
public_copy_globs = []
```

Configuration globs are validated against the current source tree. A typo that
matches nothing is a diagnostic, not silent success. Contract and configuration
paths cannot escape the repository, traverse symlinks outside it, or read
ignored secrets by default.

An authoritative-document entry requires an ID, path/glob, authority role, and
deterministic parser. `free-prose-model-interpretation` is not a valid parser.
If a configured document contains free prose beyond the deterministic schema,
the exact prose is approved source material but semantic facts interpreted from
it remain inferred candidates. Agent Spec KLL, Task Contracts, lifecycle
records, and other consumer-owned authority keep their provenance taints even
when a project deliberately also recognizes them here.

### Private override

The private tri-state override uses the platform configuration directory:

```text
Linux/WSL: ${XDG_CONFIG_HOME:-$HOME/.config}/sporkflow/overrides.toml
macOS:     $HOME/Library/Application Support/Sporkflow/overrides.toml
Windows:   %APPDATA%\Sporkflow\overrides.toml
```

It is keyed by a BLAKE3 machine-local repository key derived from the canonical
Git common-directory identity. This intentionally shares an override across
worktrees of one local repository but not across independent clones. The file
may retain a human label, but query output returns only the hash unless the user
asks for the path.

Updates take an override-file advisory lock, read and validate the complete
current file, compare its content fingerprint, write a same-directory temporary
file, fsync/flush it and its directory where supported, and atomically replace
the old file. A compare-and-swap mismatch retries boundedly and then returns a
busy diagnostic. Override updates never hold a repository writer or SQLite
transaction, which prevents lock-order cycles.

The states are `force-on`, `force-off`, and `defer`.

Installation availability is evaluated before this repository truth table. An
unprepared, globally disabled, or quiesced installation returns typed
`disabled-installation` without consulting providers; it cannot be overridden
by repository `force-on`. The table below governs only a prepared, enabled
installation. This lifecycle layer does not write or reinterpret repository
intent.

| Private override | Tracked config | Effective state |
| --- | --- | --- |
| `force-off` | any | off |
| `force-on` | valid, absent, or `enabled = false` | on |
| `defer` or absent | valid and `enabled = true` | on |
| `defer` or absent | absent or `enabled = false` | off |
| any on route | malformed | blocked configuration; never silently on |

`force-on` with no tracked config uses safe defaults and an empty approved
contract. It cannot infer an approved contract from code. `force-off` is a fast
successful no-op for every hook, CLI query, provider, and future MCP tool.

### Repository discovery

Git is the v1 authoritative repository adapter. It resolves the worktree root,
Git common directory, object format, index, and worktree identity. A non-Git
directory may analyze explicitly named files in session-only mode, but it
cannot claim repository-wide freshness or persist an authoritative snapshot.

Submodules are external repository boundaries. Symlink targets outside the
repository are not read automatically. Conflicted index stages, an unstable
worktree, an exceeded discovery budget, or ambiguous skip-worktree state
returns `unknown`, not `fresh`.

## Providers

### Provider classes

1. Tree-sitter supplies the guaranteed offline, span-accurate syntax baseline.
2. Format-native parsers handle Markdown, JSON/JSONC, YAML, TOML, HTML/HTMX,
   CSS, XML, Dockerfiles, Makefiles, manifests, schemas, and CI dialects.
3. Compiler or native adapters selectively add Python, Java, Rust,
   TypeScript/JavaScript, C#, Go, and PowerShell semantics.
4. Existing SCIP indexes add resolution only when their worktree,
   configuration, producer, and input fingerprints match.
5. Bounded live LSP facts are ephemeral supplements and never a durable
   complete graph.

The implementation pins Tree-sitter core and each grammar as one tested
compatibility set. `0.26.13` is an investigated predecessor baseline, not an
architecture pin. Exact versions and grammar licenses are implementation
locks resolved before the first provider commit.

### Safe mode and execution authorization

Safe mode may read repository bytes, Git objects, configuration, and already
available matching indexes. It performs no network access and does not run
project code, restore dependencies, build targets, execute annotation
processors, evaluate MSBuild, or generate compiler indexes.

Index generation uses a separate explicit command with a preview of the exact
executable, literal argv, working directory, environment policy, affected
files, timeout, and output limits. The command requires explicit user
authorization for that exact input plan. A tracked config cannot grant blanket
execution authority. Authorization is session-scoped and content-bound; a
changed plan requires new authorization.

### Provider protocol

The protocol generalizes Agent Spec's provider kit:

- strict manifest and project registration schemas;
- separate extractor and semantic-enricher roles;
- literal executable and argv, never shell joining;
- provider, analyzer, grammar, and configuration identity;
- worktree and input freshness binding;
- bounded stdout, stderr, diagnostics, time, memory, nodes, edges, and bytes;
- cancellation and child reaping;
- deterministic canonicalization;
- staging, complete validation, atomic publication, and last-known-good;
- stable diagnostic families and conformance receipts.

External providers cannot emit approved origin. Extractors may create
provider-scoped entities and observed or declared assertions. Enrichers may
add inferred or bound assertions against an explicit base fingerprint. A stale
enrichment never remains attached to a new base snapshot.

Provider conformance proves transport, safety, determinism, and publication
behavior. It does not prove language support or semantic quality. Every
production provider also needs real-repository precision, recall, span,
freshness, and ambiguity evidence.

## Cache, snapshots, and freshness

### Storage layout

```text
Linux/WSL: ${XDG_CACHE_HOME:-$HOME/.cache}/sporkflow/
macOS:     $HOME/Library/Caches/Sporkflow/
Windows:   %LOCALAPPDATA%\Sporkflow\Cache\

<cache-root>/
  control.sqlite3
  objects/blake3/<prefix>/<digest>.cbor.zst
  staging/
  leases/
```

The XDG path must resolve to the native Linux filesystem in WSL. If it resolves
under `/mnt/c`, the CLI warns and uses session-only storage unless the user
explicitly chooses that filesystem after seeing the atomicity and performance
risk.

The SQLite control plane stores object metadata, repository keys, file-to-
object mappings, snapshot manifests, provider layers, useful-hit sessions,
lineage, leases, and GC state. Large immutable payloads are canonical CBOR,
compressed, hash-verified, and stored outside SQLite. They are never modified
in place.

Human-reviewable migration candidates and quiescence/audit receipts use the
platform state directory, separate from cache:

```text
Linux/WSL: ${XDG_STATE_HOME:-$HOME/.local/state}/sporkflow/
macOS:     $HOME/Library/Application Support/Sporkflow/State/
Windows:   %LOCALAPPDATA%\Sporkflow\State\
```

### File objects

The per-file analysis key is:

```text
BLAKE3(
  object-schema-version ||
  analyzer-id-and-version ||
  language-and-dialect ||
  relevant-analysis-config ||
  canonical-file-bytes
)
```

Path and repository identity are not in the object key unless the analyzer
declares a path-sensitive dialect input. This permits reuse of identical bytes
at different paths. Cross-file ownership, imports, resolution, and approved
alignment are separate snapshot-scoped objects and are recomputed from cached
declarations without reparsing unchanged files.

Embedded regions include the outer file hash, outer byte range, inner dialect,
and provider identity. Secret-classified content is excluded or redacted before
persistence according to config; a redaction changes the object identity and
is visible in coverage.

### Exact freshness

The Git adapter uses NUL-delimited, no-optional-locks commands and no directory
mtime inference:

```text
git --no-optional-locks status --porcelain=v2 -z
git ls-files --stage -z
git ls-files -v -z
```

For clean tracked files, Git-canonical bytes and index OIDs are the default
analysis input only when byte identity with the visible worktree is proven. The
repository input plan fingerprints relevant Git config, `.gitattributes`, EOL,
`working-tree-encoding`, filter, and LFS attributes. If checkout transforms can
change bytes, the analyzer hashes and uses the actual worktree bytes or records
a tested reversible coordinate map. A Git-blob span is never applied to
different worktree bytes. Every evidence record names `git-blob` or `worktree`
as its byte basis.

An object-format-qualified Git OID-to-BLAKE3 mapping avoids rereading an
already-known clean blob only in the proven-identity route. Dirty tracked,
transformed clean, and nonignored untracked files use stable-handle reads:

1. Open without following a changed symlink and record file identity, size,
   modification/change timestamps, and platform generation data when
   available.
2. Read and hash all bytes through that handle.
3. Recheck handle metadata; retry if it changed.
4. Before snapshot commit, build a second complete hash vector for every dirty,
   transformed, and untracked input and require it to equal the first vector.
5. Require the pre/post Git status and attribute/config fingerprints to match.

The snapshot records the bounded interval during which both vectors matched;
`fresh` means verified for that observation, not continuously immutable after
publication. A query that needs current freshness reruns the exact vector
check. Any unstable handle, mismatched vector, worktree race, or exhausted
budget returns `unknown-worktree-raced`. Deleted, renamed, conflicted,
intent-to-add, skip-worktree, and submodule entries remain explicit states. A
timeout returns `unknown-discovery-budget`.

### Snapshot publication

A snapshot manifest references immutable file objects, cross-file resolution
objects, the approved-contract fingerprint, configuration identity, provider
layers, coverage gaps, and worktree state. Its identity is derived from the
canonical manifest.

Atlas supplies the same-filesystem immutable-generation model, but the kernel
must also coordinate SQLite and external object files. SQLite's
`current_snapshot` row is the only mutable publication authority. Publication
is:

1. Execute external providers and build the candidate without a cache or
   repository lock.
2. Acquire a shared global cache-maintenance lease, then one repository writer
   lease. Revalidate the pinned base and candidate; no external process runs
   while either lease is held.
3. Write each new object to a same-directory temporary file, flush its bytes,
   atomically rename it to its digest path, and flush the containing directory
   where the platform supports that guarantee. Existing digest paths must
   match their canonical preimage.
4. Construct and hash the immutable snapshot manifest only after the second
   input-vector validation.
5. Begin one SQLite `IMMEDIATE` transaction, insert immutable object/manifest
   rows, verify every referenced digest exists, insert the generation and
   receipt, and replace `current_snapshot`.
6. Commit SQLite. That commit is the single visibility point. Readers pin the
   generation in their read transaction/lease and never infer current state
   from directory enumeration.
7. Release the repository writer and global shared lease. Objects written
   before a failed SQLite commit are unreachable and safe for later orphan
   recovery; the previous pointer remains authoritative.

The global cache-maintenance lease is a cross-process shared/exclusive lock on
the native cache filesystem. Every reader and publisher holds it shared for
the interval in which referenced external objects must exist. GC, orphan
recovery, pointer repair, and destructive cache maintenance hold it exclusive.
They select candidates only after acquiring the exclusive lease and recheck
SQLite reachability and all generation/reader leases immediately before each
deletion. An operating-system-released lock makes a crashed publisher unable to
strand a live shared lease.

Startup integrity checks therefore cannot race publication. Under the
exclusive maintenance lease they reconcile unreachable objects, an interrupted
staging write, a pointer whose manifest is missing, and a committed manifest
whose object is corrupt. Pointer repair may move only to a completely validated
previous generation and records a recovery receipt; it never constructs a
fresh pointer from directory order. Cancellation, overflow, corruption,
provider failure, disk-full, failed flush, or SQLite failure leaves the
previous generation readable. A previous generation is reported as
last-known-good and stale; it is never relabeled fresh.

Lock ordering is global cache shared/exclusive -> repository writer -> object
publication -> SQLite write transaction. Code never acquires an override-file
lock, runs a provider, upgrades a global lease, or waits for a reader while
holding SQLite. Multiprocess publisher-versus-reader, publisher-versus-GC,
publisher-versus-recovery, crash-after-each-step, disk-full, WAL-recovery,
network/unsupported-filesystem, WSL ext4, `/mnt/c`, and native Windows tests
must establish the platform-specific guarantees. A platform that cannot
provide reliable shared/exclusive locks and atomic publication uses
session-only storage.

### Useful hits and GC

Object recency changes only when decoded content contributes to a query,
resolver result, or projection. Enumeration and freshness scans are not useful
hits. New objects are probationary and become protected only after useful hits
from two distinct Codex sessions. Standalone CLI calls without a trustworthy
session identity can keep probation alive but cannot provide the second-session
promotion by themselves.

Defaults:

| Setting | Default |
| --- | ---: |
| High water | 20 GiB |
| Trim target | 16 GiB |
| Never-used TTL | 14 days |
| Probation TTL | 60 days |
| Protected TTL | 180 days |
| Free-space reserve | max(5 GiB, 10 percent) |

GC never reclaims a leased object or the current/last-known-good generation.
Ambiguous lease state fails closed. Cache loss always degrades to uncached or
session-only analysis; it cannot make semantic correctness depend on a cache.

## Query and receipt contract

### Commands

The public CLI groups are:

```text
sporkflow activation status
sporkflow activation set-private <force-on|force-off|defer>
sporkflow contract init|validate|migrate|propose|approve
sporkflow refresh [--paths ...]
sporkflow status
sporkflow query explain|architecture|leverage|flow|impact|onboard
sporkflow drift terms|invariants|boundaries
sporkflow gate communication|claims|public-copy
sporkflow provider validate|conformance
sporkflow cache status|gc
sporkflow export --format <jsonl|turtle> --snapshot <fingerprint> --output <path>
```

`sporkflow` is the sole v1 executable name. Schema, authority-domain, and
platform-storage namespaces use the same `sporkflow` root so the new product
starts with one identity rather than preserving names that were never released.

`contract approve` is an explicit-authority command. It requires candidate IDs,
shows the exact contract diff, and executes only after the user's request grants
that mutation. `migrate` never writes approved facts directly.

### Result envelope

Every model-facing command supports strict JSON. The common envelope is:

```json
{
  "schema": "sporkflow/query-result/v1",
  "status": "ok",
  "activation": {
    "state": "on",
    "source": "tracked-config",
    "repository_key": "<blake3>"
  },
  "snapshot": {
    "generation": "g-<blake3>",
    "fingerprint": "<blake3>",
    "worktree": "dirty",
    "freshness": "fresh",
    "configuration": "<blake3>"
  },
  "query": {
    "kind": "architecture",
    "max_bytes": 24000
  },
  "data": {},
  "evidence": [],
  "omissions": [],
  "diagnostics": [],
  "receipt": {
    "providers": [],
    "budget": {},
    "coverage": {},
    "useful_objects": [],
    "continuations": []
  }
}
```

`status` is one of `ok`, `partial`, `disabled`, `unknown`, `blocked`, or
`error`. `partial` is allowed only for optional omissions that are enumerated.
Required evidence overflow, a stale required layer, an invalid contract, or a
snapshot mismatch is `blocked` or `unknown`, never a successful partial
answer.

Continuations contain literal argv arrays, not shell strings, and bind to
`--expect-snapshot <fingerprint>`. A changed snapshot or unknown cursor fails
with a typed diagnostic. Default projection ceilings are:

| Projection | Bytes |
| --- | ---: |
| Explain | 16,000 |
| Architecture | 24,000 |
| Leverage | 24,000 |
| Flow | 32,000 |
| Impact | 24,000 |
| Onboard | 24,000 |
| Claim/public-copy gate | 16,000 |

These are ceilings, not fill targets. Exact symbols, contradictions, primary
paths, approved invariants, claim anchors, and required source spans outrank
optional context. If required evidence cannot fit, the query fails with a
follow-up plan.

`export` is an explicit, non-model command for portability and offline review;
hooks and the implicit skill never invoke it. It streams one pinned snapshot,
preserves entity IDs, epistemic vectors, evidence links, provenance taints,
coverage gaps, and native plus UTF-8 coordinates, and produces an export
receipt with the snapshot and mapping-schema fingerprints. JSONL is the
lossless archival mapping. Turtle uses a versioned OPL vocabulary and emits a
diagnostic for any facet it cannot represent losslessly. An export never
becomes a second mutable authority and is never read as current without a
freshness check.

### No MCP in v1

The CLI already supplies a local, typed, bounded, testable interface to the
skill and surviving consumers. An MCP server would add startup, tool-list,
approval, and lifecycle surfaces before there is evidence that they improve
outcomes. v1 therefore ships no MCP server. A later read-only MCP adapter may
wrap the identical query envelope after A/B evaluation; it cannot gain new
authority or maintain separate state.

## Communication policy

### Precedence

The kernel resolves transformations in this order:

1. Factual and semantic fidelity.
2. Explicit user constraints.
3. Approved terminology and invariants.
4. Safety and procedural clarity.
5. Audience comprehension.
6. Evidence-backed author voice.
7. Compression and rhythm.
8. Conventional polish.

Identifiers, commands, paths, URLs, quotations, citations, approved domain
terms, numbers, units, negation, and explicit status labels are Untouchables
unless the task explicitly changes them.

### Inferred regimes

The model-facing policy selects strict controlled technical English,
pragmatic controlled clarity, dense natural collaboration, authorial voice, or
claim-gated public copy from artifact, audience, risk, and task evidence. The
user never selects a writing mode.

Only configured high-risk paths or mechanically proven high-risk operations
may hard-block for controlled-language violations. Ordinary documentation gets
scoped warnings and suggested fixes. Natural conversation, code-only edits,
creative work, and authorial prose do not inherit universal STE.

The controlled-language reference keeps all 53 adopted rules under stable rule
IDs, but loads them only after activation and regime classification. In the
strict regime, the procedural/descriptive classifier applies the adopted
20-word procedural and 25-word descriptive sentence ceilings unless an
explicit project policy selects a stricter limit. Pragmatic clarity treats
those lengths as diagnostic evidence rather than universal failures. Approved
project terms override generic vocabulary substitutions in every regime.

Voice can be learned only from explicit preferences or actual user-provided
writing. It cannot invent biography, experience, emotion, opinion, errors, or
fake casualness. Missing examples and evidence are named rather than supplied
by the model.

### Deterministic and model responsibilities

Deterministic code owns:

- activation, schema, ID, reference, hash, span, freshness, and budget checks;
- configured vocabulary matches and exact deprecated-term findings;
- Untouchable comparison;
- numeric, source-anchor, private-path, secret-label, and known leakage scans;
- cache, snapshot, provider, and receipt invariants.

Model judgment owns:

- ambiguous domain alignment;
- audience and risk inference outside configured hard surfaces;
- whether a word is meaningful terminology or ordinary prose;
- voice, emphasis, prioritization, explanation shape, and composition order;
- resolving soft findings into a useful artifact.

Model findings remain inferred. A deterministic rule with incomplete evidence
returns unknown or warning rather than guessing.

## Codex instruction and hook design

### Current product facts

The design is based on current official Codex documentation and local Codex
`0.150.1` behavior:

- Codex assembles the `AGENTS.md` chain once per run and defaults to a combined
  32 KiB project-instruction budget.
- Skills use progressive disclosure; the initial catalog carries names and
  descriptions, and implicit selection is driven by the description.
- Plugin hooks load alongside other hook sources. All matching sources apply.
- Non-managed hook trust binds to the exact hook-definition hash.
- `SessionStart` covers `startup`, `resume`, `clear`, and `compact` and can add
  developer context.
- `PostToolUse` observes supported local tools including `apply_patch`, but it
  cannot undo side effects.
- `Stop` can request continuation and exposes `stop_hook_active`.
- Plugin commands receive `PLUGIN_ROOT` and writable `PLUGIN_DATA`.
- No uninstall lifecycle hook is documented.

Sources:

- <https://learn.chatgpt.com/docs/agent-configuration/agents-md>
- <https://learn.chatgpt.com/docs/build-skills>
- <https://learn.chatgpt.com/docs/hooks>
- <https://developers.openai.com/plugins/build/plugins>

Product behavior is mutable. Implementation tests installed behavior and keeps
undocumented observations out of correctness-critical assumptions.

### One orchestration skill

The plugin publishes one skill named `sporkflow`. It is model-invoked:

```yaml
# SKILL.md frontmatter
name: sporkflow
disable-model-invocation: false
```

```yaml
# agents/openai.yaml
policy:
  allow_implicit_invocation: true
```

Its description front-loads the enabled-repository condition and the semantic
tasks it owns. It explicitly excludes debugging, TDD, review, specs, research,
publishing, and media workflows. `SKILL.md` itself is an activation-only
bootstrap:

1. Its first operational step calls `sporkflow status`.
2. `disabled` returns immediately without reading sporkflow-policy references,
   classifying the task, transforming the response, or running another kernel
   command.
3. An active status loads `references/common-policy.md`, which owns shared
   precedence, classification, query, and completion rules.
4. Only that policy may select and load one or more task-specific references.

The task-specific references cover:

- domain and drift;
- architecture, flow, impact, leverage, and onboarding;
- controlled clarity;
- authorial voice and composition;
- claims and public copy.

No predecessor mode survives as another public skill. No semantic instructions
are appended to global `AGENTS.md`. The globally visible skill description is
the unavoidable small catalog cost while per-repository plugin enablement is
not native; behavioral evaluation must show that disabled repositories remain
unchanged. The disabled-path fixture also proves that no policy reference was
read and no semantic vocabulary or style instruction influenced the answer.

### One hook dispatcher

One `hooks/hooks.json` points every event at one dispatcher. It uses:

- `SessionStart` for `startup|resume|clear|compact`;
- `PostToolUse` for `apply_patch|Edit|Write|Bash` reconciliation signals;
- `Stop` for a bounded high-confidence repair gate.

The dispatcher begins by resolving activation. Off returns exit zero with no
stdout, stderr, state mutation, provider execution, or context injection.

`SessionStart` performs only the hybrid freshness check, records the session,
and emits a small packet containing activation, snapshot/freshness state,
coverage summary, and a pointer to `$sporkflow`. It never injects the
graph or a large glossary.

`PostToolUse` treats the event payload as a hint, not an authority. Known tool
shapes can nominate paths, but an absent or changed `file_path` falls back to a
bounded Git reconciliation. The hook records a pending watermark and performs
no whole-repository rebuild. Any diagnostic explicitly says the tool has
already run.

`Stop` runs only when deterministic state records an unresolved required repair
on a configured high-risk surface. It requests at most one continuation per
turn, checks `stop_hook_active`, and does not start a general writing review.

Hook invocations are idempotent, repository-keyed, atomic, and safe under
concurrent additive hook execution. They do not depend on `SessionEnd` for
correctness or cleanup.

### Live uninstall and missing cache

The trusted hook must not execute from the removable plugin cache. Before a
hook definition is enabled or trusted, the coordinated installer materializes
a content-verified, immutable hook-runtime bundle below the platform state
directory and installs a tiny ABI-major launcher at a stable state path. The
bundle contains activation parsing and the complete hook dispatcher; it does
not need a script or binary below `PLUGIN_ROOT` to handle an event. The
installer records a random installation-instance ID, plugin-generation digest,
hook-definition digest, expected package-root digest, and runtime-bundle digest,
then atomically switches the state `current-installation` pointer. Reinstalling
the same package bytes creates a new instance ID.

`hooks.json` contains only platform-specific invocation of that stable launcher
path: a POSIX `command` and native PowerShell `commandWindows`. If the launcher
was never prepared, the inline command exits zero without output or mutation;
the plugin remains installation-incomplete, and the explicit installer/status
check reports `hook-runtime-unprepared` before enablement can be declared
successful. Normal hooks never perform first-run installation.

The stable launcher is not garbage-collected automatically. It opens the
current immutable runtime generation under an execution lease, verifies the
recorded digest, and transfers the event to it. Runtime maintenance can delete
an old bundle only after its session and execution leases expire; removing the
stable launcher itself requires an explicit final cleanup after all sessions
using the old hook definition have been restarted. Thus package-root removal
cannot race a check-then-exec path, and a live hook never executes a file that
Codex package removal owns.

The leased runtime resolves effective repository activation before any
lifecycle diagnostic or state write:

- `disabled` or `force-off`: exit zero with no output, state mutation, provider
  execution, or context injection, even when the package root is missing;
- active plus matching package root: process the event normally;
- active plus a state-primary quiescence marker for this installation instance:
  exit zero without output;
- active plus missing or digest-mismatched package root and no quiescence
  marker: the one process that atomically creates the instance-scoped reported
  marker emits event-valid `unexpected-plugin-root-missing` context, then exits
  zero; later events exit silently.

The warning says that a `PostToolUse` trigger may already have mutated state. A
package fault never turns that earlier tool result into a reported failure.
Installation, quiescence, reported, session, and lease records are
state-primary; `PLUGIN_DATA` may contain a disposable audit mirror but is never
required for correctness.

Because Codex documents no uninstall callback, cleanup is coordinated:

1. `sporkflow uninstall --quiesce` marks the current installation instance
   in platform state, makes its runtime report disabled, and waits boundedly for
   active dispatcher leases.
2. Disable the plugin without deleting its package, then start a clean Codex
   session and prove its skill catalog and hook set no longer contain the
   plugin. This is the session boundary for skill metadata as well as hooks.
3. Remove the plugin package/cache. Retained state launchers and runtimes make
   any unexpectedly old loaded hook definition safe.
4. A later maintenance command removes unleased runtime generations. It keeps
   the stable launcher until a clean-session check proves no loaded definition
   needs it and the user requests final cleanup.

The retained runtime makes direct package removal hook-safe: inactive
repositories remain neutral, and active repositories warn once. It cannot
atomically remove a skill entry already loaded into Codex's current catalog;
that unsupported bypass may leave a stale, uncallable skill until restart and
is reported by the runtime. The coordinated path therefore requires the clean
session before deletion. Cache and private overrides may remain for reinstall;
project contracts are never deleted. Tests exercise unprepared installation,
live quiesced uninstall, direct removal and its stale-catalog diagnostic,
corrupt upgrade, deleted `PLUGIN_DATA`, same-generation reinstall, package
removal during every hook event, and launcher/runtime lease races on POSIX and
native Windows.

## Consumer contracts

### General adapter rule

Consumers call `activation status` and a bounded query. They branch explicitly:

- `disabled`: use the consumer's independent fallback without warning noise;
- `ok`: consume only the requested projection;
- `partial`: consume retained facts and surface the omission receipt;
- `unknown` or `blocked`: do not claim semantic completeness; use fallback
  where safe and report the gap;
- `error`: retain the last-known-good result only with its stale label.

No consumer reads the cache database or object files. No consumer writes the
contract through a query path.

### Matt workflows

`ask-matt`, `diagnosing-bugs`, `triage`, `wayfinder`,
`setup-matt-pocock-skills`, `setup-ts-deep-modules`, and curated TDD migrate
from retired skill names and `CONTEXT.md` assumptions to the common query
envelope. They retain their workflow authority.

When the kernel is disabled or unavailable, they may read legacy
`CONTEXT.md`, `CONTEXT-MAP.md`, and ADRs directly if present. An absent legacy
document remains a normal no-domain-context case. A requested semantic
mutation that cannot reach the kernel is reported as unavailable; it is not
silently discarded.

### Agent Spec

Agent Spec keeps its existing Rust Atlas and external-provider fallback. When
the kernel is enabled and fresh, an adapter down-projects semantic entities and
assertions into Agent Spec's narrower provider graph and binding shapes.

The adapter declares `consumer=agent-spec` and a purpose of either `authoring`
or `verification`. Authoring may consume approved vocabulary, context,
architecture, and observed implementation evidence, but it cannot mark a
requirement satisfied. Verification uses an explicit allowlist of independent
`repository:source`, `repository:test`, and `runtime:trace` evidence and denies
all transitive `agent-spec:*` taints, including evidence routed through an
authoritative document, the semantic contract, a model inference, or a cache.
A required denied assertion blocks the projection.

The receipt lists every included and rejected authority domain, dropped facet,
unresolved identity, evidence downgrade, freshness difference, governing
purpose policy, and rejected assertion ID. A lossy projection cannot report
complete coverage. KLL requirements, Task Contracts, lifecycle verdicts,
requirement trace, archive state, and human governance remain Agent Spec
authority. The kernel cannot satisfy or approve a requirement.

The kernel independently implements or adapts the proven Atlas/provider-kit
behavior without making Agent Spec depend on a kernel crate in v1:

- preserve Atlas's generic immutable-generation, pointer-swap, reader-lease,
  budget, cancellation, and receipt semantics in the kernel's neutral
  contracts;
- keep Rust-specific node kinds, `syn`/SCIP/MIR layers, and query behavior in
  Rust Atlas;
- generalize freshness to keyed layers;
- publish actual JSON Schemas for the kernel wire protocol;
- eliminate Agent Spec's best-effort empty fallback where it masks provider
  failure; disabled and unavailable remain typed states.

A later shared-crate migration is a separate compatibility project with
equivalence fixtures and an independent release. It is not a v1 prerequisite.

### Nyx and publishing adapters

Nyx consumers receive claim ledgers, supported/not-supported boundaries,
source anchors, freshness, leakage diagnostics, and `BLOCK|WARN|OK`. Promotion,
media packaging, scheduling, account selection, and final human approval remain
outside the kernel. Current live Nyx source does not justify inventing a
scheduler integration.

## Legacy contract migration

`sporkflow contract migrate` recognizes:

- root `CONTEXT.md`;
- root `CONTEXT-MAP.md`;
- configured context directories;
- root or context ADR directories;
- explicit retired domain-modeling layouts.

The command parses deterministic structure and writes a candidate bundle plus a
mapping report outside the approved contract. By default it writes below
`<platform-state>/candidates/<project-id>/<candidate-bundle-id>/`; an explicit
`--output` may select another non-contract path. Candidate output is mode
`0700`/`0600` on POSIX and user-only ACL on Windows where the platform permits.
Each candidate includes exact source spans, confidence, ambiguity, target
contract record, and any unresolved context or alias. It never deletes or
rewrites legacy documents and never writes `.opl/sporkflow/contract.toml`.

The user reviews candidates and explicitly runs `contract approve` for selected
IDs. Approval writes one atomic contract diff. A second validation proves IDs,
references, definitions, term statuses, invariant scopes, boundary directions,
and ADR paths. Legacy domain documents remain authoritative inputs and rollback
assets until the extinction gate and rollback rehearsal both pass. Removing
them from a target repository is a separate, reviewed commit after its
migration report has no unaccounted authoritative entry and all of that
repository's surviving consumers use the new contract. Ambiguous removal
requires user direction.

## Failure and degradation model

| Failure | Required behavior |
| --- | --- |
| Plugin or repository disabled | Silent successful no-op; consumer fallback remains available |
| Invalid tracked config or contract | `blocked`; exact diagnostic; no inferred fallback contract |
| Cache unavailable/corrupt/busy/disk-full | Uncached or session-only analysis; last-known-good stays stale |
| Worktree changes during discovery | One bounded retry, then `unknown-worktree-raced` |
| Discovery timeout | `unknown-discovery-budget`, never fresh |
| Unsupported file or dialect | Explicit coverage gap; other layers remain usable |
| Provider partial/stale/wrong-worktree | Reject publication; retain last valid provider layer |
| Semantic overlay stale | Keep syntax layer distinct; definitive binding queries block |
| Required query evidence exceeds budget | Typed failure and continuation plan |
| PostToolUse failure | State that mutation already occurred; never imply rollback |
| Missing package root after quiesced uninstall | Retained runtime exits zero with no output |
| Active repository, missing package root without quiescence proof | Retained runtime warns once as structured context, then exits zero |
| Disabled repository, missing package root | Retained runtime exits zero with no output or mutation |
| Multiple hook sources | Idempotent repository lock and one plugin dispatcher; no cross-hook ordering assumption |
| Model ambiguity | Inferred low/medium confidence or unknown; never approved |
| Public claim lacks evidence | `BLOCK` for public-ready verdict; do not invent a source |

Silent partial success is prohibited. Diagnostics have stable codes, severity,
affected evidence, and an actionable next step. External-call transient retries
are bounded and logged structurally; the final error is returned.

## Privacy and security

- Analysis is local and offline by default.
- Ignored files, secrets, private keys, credential stores, and files outside
  the repository are excluded unless an explicit query and policy allow them.
- Evidence projections minimize source text and return spans plus bounded
  excerpts.
- Private repository paths, branch names, run IDs, internal labels, secret
  names, and unpublished tool names participate in public-copy leakage scans.
- Provider registrations are disabled by default. Executables and argv are
  literal, bounded, and content-identified.
- Compiler/index generation cannot inherit blanket authority from tracked
  config or a model decision.
- Cache objects carry privacy class and are removed when policy changes make
  their persistence invalid.
- Query and diagnostic output never labels syntax evidence as bound behavior.

## Licensing and provenance

The new plugin ships an SPDX dependency inventory, generated SBOM, and
`THIRD_PARTY_NOTICES.md`. Each adopted predecessor capability maps to source,
license, implementation owner, and test.

Required boundaries:

- Code Ontology Companion is Apache-2.0 with its notices/SBOM obligations.
- SimpleEnglish is MIT.
- Nyx claim skills declare MIT and retain Ornn/ChronoAIProject attribution.
- Rust Atlas and the Agent Spec provider kit are MIT.
- Tree-sitter core and every grammar/parser dependency require individual
  license recording.
- Repository-local skills without standalone declarations need repository-owner
  classification before derived text or code is published.
- Caveman BSL engine, cacheengine, rewriter, browser, proxy, MCP, shrinker, Go
  memory core, and shared/platform code are research-only. Useful ideas are
  independently implemented.

License classification is a build input and release gate, not a final cleanup
task. A one-time provenance comparison is required before release. A new
repository-wide recurrence guard is not added without explicit approval.

## Evaluation plan and extinction thresholds

### Corpus and baselines

Preregister and freeze the evaluation protocol, rubrics, prompts, fixture
repositories, expected routing labels, condition implementations, model IDs,
sampling parameters, seed list, analysis code, and exact input hashes before
the final held-out run. Training, tuning, and held-out sets have no prompt,
repository, template, or near-duplicate leakage.

The held-out package freezes an ordered reserve of 1,200 unique prompts. The
initial analysis uses the first 600 in six strata of 100:

1. domain vocabulary, contract alignment, and drift;
2. architecture, explain, flow, impact, leverage, and onboarding;
3. controlled clarity and high-risk procedure writing;
4. authorial voice and composition;
5. claim fidelity and public copy;
6. mixed-capability, disabled-state, and routing conflicts.

Every stratum contains 50 task-positive and 50 matched negative-routing
prompts. Each prompt runs five paired seeds per applicable condition, using the
same seed and model configuration across conditions. Seed scores are aggregated
within prompt; the prompt, not the seed or judge rating, is the independent
statistical unit.

Before condition labels are unblinded, a condition-blinded pooled variance
re-estimation may admit the next preordered reserve prompts in complete blocks
of 120, adding ten positive and ten negative prompts per stratum, up to 1,200
prompts. It may not generate or reorder a prompt, reduce the corpus, or change
a rubric, mapping, margin, family, or acceptance threshold.

As part of preregistration and before any run, the protocol maps every adopted
capability and every integrated interaction to its applicable positive prompts
and assigns each primary hypothesis to exactly one of the six families. Each
capability and interaction needs at least 100 independent applicable prompts or
the larger minimum produced by the power simulation; prompts may support
multiple mapped capabilities, but a seed or repeated judge rating never
increases `N`. The frozen package includes the mapping and per-hypothesis `N`.

At the multiplicity-adjusted alpha defined below, simulation must demonstrate
at least 80 percent power for every release-gating decision: the 95/90 percent
capability pass bounds, two-point capability non-inferiority, ten-point
interaction superiority against both comparators, two-percent routing upper
bound, five-point implicit-invocation non-inferiority, and ten-point stratum
regression bound. It states effect distribution, variance, within-prompt
correlation, missing-run assumption, and simulation seed. If any mapped
hypothesis is underpowered or under its minimum `N` at 1,200 prompts, the
release gate cannot pass; the architecture and a new unseen corpus are required
before another attempt.

Controlled-language routing compares:

1. plugin disabled;
2. a one-line instruction;
3. implicit Sporkflow orchestration;
4. explicit Sporkflow invocation;
5. the relevant predecessor.

Predecessor baselines remain genuinely callable without returning them to the
ordinary skill catalog: run the repository at pinned commit
`afef51e12eb08f1270a7e4a0a8acef766582caba` in temporary clean worktrees with
an isolated `CODEX_HOME`, isolated caches, clean sessions, the new plugin
disabled, and external sources pinned to the commit and license recorded in
the predecessor manifest. Caveman may execute only inside the licensed research
evaluation boundary; none of its source or derived implementation is copied
into the shipped plugin. Record the exact commit, plugin registry, hook trust,
model identity, environment fingerprint, and baseline command for every run.

Deterministic graders run first. Two independent judges, blinded to condition
and predecessor identity, score semantic fidelity, audience fit, voice, and
usefulness against the frozen rubric. Deterministic checks resolve mechanically
decidable fields. A third blinded judge adjudicates human/model disagreements;
the audit set includes every hard-gate case and a stratified random 20 percent
of the remainder. Judge identity, disagreement, adjudication, and exclusions
are retained in the receipt. The ExplainX article's benchmark remains a
hypothesis.

Primary paired estimates use prompt-level differences and a stratified paired
bootstrap with 10,000 resamples. Family-wise alpha is 0.05 across all primary
hypotheses. The protocol allocates `0.05 / 6` to each fixed stratum family and,
within family `f`, uses `alpha_f / m_f` for each of its `m_f` preregistered
primary hypotheses. Thus every release comparison uses simultaneous
Bonferroni-adjusted one-sided bounds; secondary endpoints are descriptive and
cannot rescue a failed primary gate. This deliberately conservative two-level
allocation controls both between-family and within-family multiplicity without
post-hoc endpoint selection.

For the "better of" interaction baseline, there is no data-dependent winner:
the kernel must meet the superiority bound in two separately counted primary
hypotheses, one against the relevant predecessor and one against the one-line
baseline. Negative routing uses a Wilson score upper bound at its assigned
simultaneous confidence level over independently labeled negative prompts.
Report adjusted one-sided bounds for directional gates, adjusted two-sided
intervals for primary descriptive estimates, exact paired counts, and effect
sizes. No post-hoc subgroup may become a release gate.

### Hard gates

All of these require 100 percent pass:

- no inferred, observed, declared, or model-generated fact silently becomes
  approved;
- identifiers, commands, paths, URLs, citations, quotations, approved terms,
  numbers, units, negation, and explicit status labels survive transformations
  unless the task changes them;
- no unsupported public claim receives `OK`;
- disabled and `force-off` repositories produce no hook state mutation,
  provider execution, injected context, contract mutation, or transformed
  output;
- stale, partial, timed-out, raced, corrupt, or wrong-worktree evidence is
  never labeled fresh;
- failed or cancelled publication leaves the last committed snapshot readable;
- generating a compiler-backed index never occurs without exact explicit
  authorization;
- all mandatory license and attribution records are present.

### Behavioral thresholds

On the held-out corpus:

- each adopted predecessor capability must have a point rubric-pass rate of at
  least 95 percent, a multiplicity-adjusted one-sided Wilson lower bound of at
  least 90 percent, and an adjusted paired lower confidence bound versus its
  predecessor above negative two percentage points on its primary score;
- the adjusted paired lower confidence bound for multi-capability interaction
  improvement must be at least positive ten percentage points independently
  against the relevant single predecessor and against the one-line baseline;
- the negative-routing false-activation point rate must be at most two percent
  and its multiplicity-adjusted one-sided Wilson upper bound must also be at
  most two percent;
- plugin-disabled, `force-off`, code-only, quotation-only, and Untouchable
  hard subsets require zero false activations;
- the adjusted paired lower confidence bound for implicit invocation minus
  explicit invocation must be greater than negative five percentage points on
  both semantic fidelity and task usefulness;
- every preregistered stratum must have a lower paired confidence bound above
  negative ten percentage points against its relevant predecessor, and no
  stratum may contain a hard-gate regression.

Hard gates accept only zero observed violations. Report the rule-of-three
upper bound for those zero counts to make residual uncertainty visible; the
bound does not waive the zero-violation rule. Report all exclusions, missing
runs, paired counts, intervals, seeds, judge disagreements, and hard-gate
failures. A missing or invalid run fails closed unless the preregistered
protocol defines a condition-blind infrastructure retry. A threshold can
change only through a reviewed architecture amendment made before looking at
the affected held-out results.

### Performance and context budgets

Initial targets, measured on the handoff's `psychord`-class repository and a
small fixture repository:

- model-invoked skill catalog description at most 600 UTF-8 bytes;
- SessionStart packet at most 1,200 UTF-8 bytes;
- warm exact SessionStart freshness p95 at most 150 ms;
- cold exact repository freshness p95 at most 750 ms;
- PostToolUse watermark/reconciliation p95 at most 100 ms when no refresh is
  required;
- no default projection above its declared byte ceiling;
- cache stays below the 20 GiB high water and restores the free-space reserve;
- cache-disabled results remain semantically correct, with measured latency
  reported rather than hidden.

These are release gates for the measured reference environments, not universal
hardware promises. A miss requires profiling and an explicit revised budget;
it is not waived by higher semantic scores.

### Required matrices

The test suites cover the handoff matrices in full:

- semantic contract: concepts, corrections, aliases, deprecated terms,
  context homonyms, invariants, boundaries, approval, ADR thresholds,
  persistence, and negative promotion;
- evidence: deterministic inputs, analyzer versions, Unicode spans, embedded
  languages, possible versus bound, stale/dirty/unstable worktrees,
  unsupported formats, SCIP match/rejection, cancellation, privacy, and atomic
  publication;
- writing: every pairwise precedence conflict plus multi-way composition and
  user-edit invalidation;
- cache: tracked, dirty, untracked, rename, delete, branch, worktree, merge,
  pull, identical content at new paths, CRLF and EOL conversion,
  `working-tree-encoding`, clean/smudge filters, Git LFS pointers, changed
  `.gitattributes`, symlink swaps, stable-handle replacement, version
  invalidation, faults, GC states, useful hits, timeout, and cache-off;
- hooks: startup, resume, clear, compact, edit payload variants, Bash mutation,
  additive hooks, Stop loop guard, force-off, unprepared runtime, state-launcher
  lease, quiesced live uninstall, direct removal, corrupt upgrade, deleted
  `PLUGIN_DATA`, same-generation reinstall, missing cache, retrust, bounded
  injection, activation-before-warning, one-time warning, and post-mutation
  failure on POSIX and native Windows;
- publication: two writers, writer/readers, process kill after every step,
  failed flush/rename/SQLite commit, WAL recovery, orphan recovery, pointer
  repair, disk full, digest collision, and unsupported/network filesystem;
- migration: every predecessor capability, surviving consumer, config record,
  hook, marketplace entry, cache, disabled fallback, rollback, and clean new
  session.

### Extinction gate

Delete `.temp/predecessors/` only when:

1. Every adopted capability has an implementation and passing mapped test.
2. Every rejection remains recorded with rationale.
3. Hard, behavioral, routing, cost, cache, lifecycle, privacy, license, and
   migration gates pass.
4. All surviving consumers use the stable query contract or a deliberate
   independent fallback.
5. No executable routing, active instruction, config, marketplace entry, hook,
   trust record, skill catalog, consumer, or clean-session cache names a
   retired capability as callable or authoritative. Immutable architecture,
   license, provenance, migration, and extinction evidence may and must retain
   historical names, each labeled non-callable.
6. One clean session in an enabled repository and one in a disabled repository
   demonstrate the expected difference without predecessor caches.
7. Rollback from the release candidate has been exercised.
8. A tracked durable evidence bundle exists at
   `docs/superpowers/evidence/sporkflow-extinction/<release>/`. It records
   the capability and rejection map, source commit/blob identities, external
   repository pins, license classifications and required notices, corpus and
   fixture hashes, baseline environment manifests, statistical protocol and
   receipts, migration map, clean-session evidence, rollback rehearsal, and
   rollback tag. It references but does not reproduce third-party source beyond
   its license.
9. A private content-addressed rollback vault contains every license-permitted
   source/package/config artifact needed by the rollback contract, and a
   restoration rehearsal passes with `.temp/predecessors/` and all external
   working clones unavailable.
10. The evidence bundle can be verified without `.temp/predecessors/`, and the
    user accepts it.

## Migration and rollout

### Releasable slices and ownership

Each slice is independently versioned, testable, disableable, and rollbackable.
No slice deletes a predecessor or legacy domain document.

| Slice | Owner | Independently releasable outcome | Exit condition |
| --- | --- | --- | --- |
| `0.1-foundation` | kernel core | Activation, strict schemas, contract validation, Git repository identity, immutable store, status, and Rust/Markdown/TOML/JSON providers; no blocking hooks | Authority, activation, freshness, publication, fault, and disabled-path suites pass |
| `0.2-semantic` | provider/resolver | Remaining declared provider matrix, keyed enrichments, alignment/drift, bounded projections, migration candidates, and shadow consumer adapters | Provider conformance, coverage receipts, identity/join, projection, and no-self-evidence suites pass |
| `0.3-communication` | policy/query | Audience, composition, controlled clarity, voice, claim, and public-copy decisions in report-only mode | Frozen routing and fidelity development gates pass with no hard violations |
| `1.0-extinction-candidate` | integration/release | Stable consumer adapters and configured high-risk blocking gates | Full held-out, clean-session, migration, license, provenance, rollback, and extinction gates pass |

The kernel-core owner controls IR/protocol/store schema changes; provider
owners control provider releases behind conformance; policy owns routing and
composition; each consumer owner owns its adapter and fallback; the release
owner alone coordinates the extinction candidate. Any schema-major mismatch
leaves the prior slice active or force-disables the kernel. Staged deployment
survival is tested by upgrading and rolling back across every adjacent slice
with existing snapshots, overrides, contracts, live sessions, and consumers.

### Phase 0 -- architecture and evidence

- Accept this architecture after adversarial review.
- Freeze evaluation corpora before implementation scoring.
- Record dependency licenses and implementation-time version locks.

### Phase 1 -- protocol, authority, activation, and store

- Implement strict schemas and golden fixtures first.
- Implement the epistemic vector, contract parser, activation truth table,
  repository identity, immutable objects, snapshots, receipts, and fault
  injection.
- Keep the plugin uninstalled and hooks absent.

### Phase 2 -- providers and bounded queries

- Add Git, Tree-sitter, format, Rust Atlas, and existing-SCIP providers in that
  order.
- Add alignment/drift and bounded projections.
- Add legacy contract migration candidates.
- Run provider conformance and cache fault matrices.

### Phase 3 -- shadow Codex integration

- Scaffold the plugin only now.
- Add the single skill and hook dispatcher in report-only mode.
- Install under a new version identity, prepare and verify the state-resident
  hook runtime, then enable/trust the stable hook definition and test clean
  sessions. Trust never precedes a passing `hook-runtime-prepared` check.
- Do not remove predecessor global state.

### Phase 4 -- consumer adapters

- Migrate Matt consumers, Agent Spec, and Nyx to typed optional queries.
- Preserve documented disabled/unavailable fallbacks.
- Bump every changed surviving plugin version before refreshing caches.
- Remove dangling `/wait-what` routing while touching the Matt router unless a
  live owner is established.

### Phase 5 -- behavioral promotion

- Run all baselines, held-out seeds, interaction tests, cost measurements, and
  adversarial review.
- Move configured high-risk gates from report-only to blocking only after their
  precision gate passes.
- Tag the rollback point and release candidate, build the private rollback
  vault, and record its content digests in the tracked evidence candidate.

### Phase 6 -- coordinated predecessor retirement

- Quiesce and remove predecessor plugins and hook trust state.
- Remove semantic duplication from OPL global instructions and hooks without
  changing unrelated OPL behavior.
- Remove retired skill config entries, marketplace traces, caches, and live
  consumer names.
- Keep the ignored source corpus and every target repository's legacy domain
  documents until the extinction evidence and rollback rehearsal pass.
- Verify new sessions rather than relying on the migration session.

### Phase 7 -- extinction

- Commit the durable capability, provenance, license, evaluation, migration,
  clean-session, and rollback evidence bundle described by the extinction
  gate. Verify it without reading `.temp/predecessors/`.
- Obtain user acceptance.
- Delete the complete ignored predecessor corpus and its manifest.
- External working clones may remain only for independent research value;
  rollback correctness uses the vault, not those working directories.

### Rollback

Before extinction, rollback force-disables the new kernel, restores the exact
predecessor packages from the staged corpus, restores their recorded config and
hook state through reviewed operations, restores any migrated target documents
from their pre-migration commits, and starts a clean session.

Phase 5 also creates a durable private rollback vault outside cache:

```text
Linux/WSL: ${XDG_DATA_HOME:-$HOME/.local/share}/sporkflow/rollback/<release>/
macOS:     $HOME/Library/Application Support/Sporkflow/Rollback/<release>/
Windows:   %LOCALAPPDATA%\Sporkflow\Rollback\<release>\
```

It contains content-addressed Git bundles for this repository and every target
repository/ref needed to restore retired packages or legacy documents,
content-addressed archives for pinned external/non-Git inputs, the exact local
plugin/config/hook/trust restoration plan with secrets excluded, all required
licenses/notices, and a signed or content-identified manifest. It is private
user data with user-only permissions, is never loaded into the skill catalog or
normal analysis, and is not shipped with the plugin. License classification
must permit private retention of every included artifact; otherwise full
post-extinction predecessor rollback cannot pass and any narrower promise
requires explicit user acceptance as an architecture amendment.

The tracked evidence bundle records vault object hashes and the rollback tag,
not restricted source bytes. The rehearsal temporarily makes `.temp` and
external working clones unavailable and restores solely from the vault. After
extinction, rollback uses the vault, tag, tracked evidence, and restored Git
history, never an ignored corpus, working clone, network fetch, or cache. The
vault persists for the lifetime of the rollback promise. Deleting it is a
separate explicit destructive operation that first retires and documents that
promise.

Project contracts are preserved throughout because they are user data, not
plugin cache. Legacy document deletion, when separately approved after
extinction, occurs in a reversible target-repository commit.

## Explicitly rejected designs

- Multiple public writing or modeling modes.
- Universal controlled English or faux-caveman grammar.
- A model or provider that writes approved meaning.
- Reusing Rust Atlas's Rust-closed node and edge enums as the cross-language IR.
- A second semantic system that ignores Atlas mechanics and Agent Spec
  consumers.
- Direct cache/database reads by consumers.
- Syntax evidence presented as binding or runtime truth.
- Automatic project builds, restores, processors, MSBuild, or index generation.
- Repository-only cache hashes, directory-mtime freshness, mutable shared
  snapshots, and cache copying through worktree helpers.
- Graph dumps in model context.
- Multiple overlapping plugin hook packages or cross-hook ordering assumptions.
- Post-write hooks that claim rollback.
- Global `AGENTS.md` mutation or literal `@path` includes.
- Startup architecture nagging.
- Publishing authority inside the kernel.
- BSL Caveman runtime code reuse.
- The withdrawn cache tournament or reanalysis loop.

## Implementation locks and residual product facts

These do not change the architecture, but the implementation must resolve and
record them before scaffolding:

- the exact Rust MSRV, Tree-sitter core, grammar, format-parser, SQLite, CBOR,
  and compression versions and their licenses;
- the release target matrix and binary-signing/checksum process;
- the current Codex plugin manifest validator and hook input JSON Schemas;
- whether `PLUGIN_DATA` survives every supported uninstall path; correctness
  does not depend on survival;
- the exact local plugin-enable registry format; the dispatcher does not parse
  undocumented config for correctness;
- per-platform atomic rename, advisory lock, filesystem, and disk-full behavior.

An implementation lock is resolved with source, executable help, official
documentation, and a regression fixture. It does not become an inferred global
product promise.
