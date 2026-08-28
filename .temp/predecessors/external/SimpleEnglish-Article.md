# ASD-STE100: The Aerospace Standard Fixing AI Slop Writing


GitHub Repo: [AminBlg/SimpleEnglish](https://github.com/AminBlg/SimpleEnglish?ref=explainx)

A GitHub agent skill forces LLMs into ASD-STE100, a 1983 aerospace English standard — measured 72.9% fewer AI writing violations across 6 Claude models.

Jul 31, 2026·9

A **1983 aerospace writing standard** is having an unlikely moment in AI tooling. **AminBlg/SimpleEnglish**, an open-source agent skill that forces LLMs to write in **ASD-STE100 Simplified Technical English**, hit **468 GitHub stars** and **232 points on Hacker News** with a genuinely contested debate underneath: is this a real fix for AI slop, or a whole repo built around one system-prompt line?

----------

## TL;DR


| Question | Answer |
| --- | --- |
| What is ASD-STE100? | Controlled-English standard, aerospace industry, since 1983 |
| What does the skill do? | Paraphrases STE's 53 rules for docs, errors, incident reports, release notes |
| Measured effect | 72.9% fewer STE violations/100 words, avg. across 6 Claude models |
| Bonus effect | Output tokens dropped on all 6 models tested |
| Install | npx skills add AminBlg/SimpleEnglish — Claude Code, Cursor, Codex, Gemini CLI, ~25 harnesses |
| License | MIT, unofficial — not affiliated with ASD or STEMG |
| Top HN objection | "This is a system-prompt line, not a skill" |
| Skill's own answer to that | Doesn't disagree much — argues packaging + testing is the value-add |
| Scope | Docs, errors, runbooks, incident reports, AGENTS.md — explicitly not marketing or blog voice |

----------

## Before / after, straight from the README

The repo's clearest pitch is a side-by-side of real, unedited Claude output against the same model with the skill loaded:

**Without skill:**

> _"Leveraging sqlpipe's robust architecture, users can seamlessly synchronize their Postgres tables to S3 with minimal configuration overhead. Before getting started, you should ensure that your AWS credentials have been properly configured — this is crucial for avoiding frustrating permission issues down the line."_

**With skill:**

> _"sqlpipe copies your Postgres tables to S3. It needs one configuration file. Before you start, make sure that your AWS credentials are correct. If they are not, S3 rejects the upload with a permission error."_

Same pattern on error messages — _"We have identified an issue that may have impacted some users' ability to access the service. We sincerely apologize for any inconvenience this may have caused"_ becomes _"Between 14:02 and 14:31 UTC, 12% of requests failed. A deploy at 14:00 removed the cache warmup step. We reverted it at 14:27."_ — a shift from vague corporate apology to a timestamped, actionable incident line.

----------

## What ASD-STE100 actually bans

The skill paraphrases the standard's 53 numbered rules across 9 sections. The ones doing the heavy lifting for AI-specific tells:


| Rule | What it kills |
| --- | --- |
| Max 20 words per sentence | Run-on "and it's important to note that…" sentences |
| No "-ing" verb forms | "...making it easy to..." hedge clauses |
| Active voice only | "It should be noted that…" passive filler |
| No should/would/may/might | Hedging (can, will, must still approved) |
| Condition before command | Trailing "...if the flag is set" instructions readers execute too late |
| One instruction per sentence | Multi-step sentences nobody follows correctly at 2am |
| Keep articles, keep "that" | STE is short, not telegraphic — a real distinction from generic "be concise" prompting |

That last rule matters more than it looks: naive "be terse" prompting tends to produce clipped, ambiguous fragments. STE's discipline is closer to **controlled clarity** than compression — it keeps grammar intact while eliminating hedges, passive voice, and multi-clause sentences.

----------

## The benchmark, and its honest caveats

The repo's measured result: **72.9% fewer STE violations per 100 words**, averaged across **6 Claude models × 8 writing tasks = 96 generations**, using a **deterministic regex linter** applied identically to both the baseline and skill-on conditions.


| Model | Baseline viol./100w | With skill | Reduction |
| --- | --- | --- | --- |
| claude-opus-4-8 | 1.05 | 0.62 | 41% |
| claude-opus-4-7 | 2.28 | 0.42 | 82% |
| claude-opus-4-6 | 2.24 | 0.40 | 82% |
| claude-opus-4-5 | 2.55 | 0.57 | 78% |
| claude-sonnet-5 | 2.67 | 0.53 | 80% |
| claude-sonnet-4-6 | 2.06 | 0.52 | 75% |

Output tokens also dropped on every model tested — the skill makes responses **shorter**, not just more rule-compliant. The author documents the method and results openly in the repo (`evals/run_bench.py`, `evals/results/RESULTS.md`) and states it needs only a logged-in Claude Code CLI to reproduce — a meaningfully more rigorous receipts trail than most "skill" repos ship with.

Caveats the author states directly: the repo does **not** claim STE certification (nothing does — ASD certifies no tool), and the primary-source audit found real gaps in secondary online sources about which modal verbs are approved (can/will are, contrary to some blog summaries).

----------

## The "just write one line in AGENTS.md" objection

The top HN thread was pure skepticism:

> **Planktonne:** _"This is cruft. No one who is capable of using this needs it — it's a line in the prompt at most."_
> 
> **sixhobbits:** _"Yes the prompt 'only output ASD-STE100 Simplified Technical English' does the same thing as the skill. But it's very useful and skills is a good way to share prompts, so whatever."_
> 
> **hsaliak:** _"Output tokens are precious, be succinct in your responses. Use ASD-STE100 simplified technical english"_ — reports this single line works for them, linked to their own `system_prompt.md` as evidence.

This is a fair critique, and the repo's own FAQ makes a similar case rather than fighting it: _"Why not just prompt 'write clearly'? 'Clearly' is an opinion. 'No sentence over 20 words' is a spec. Agents follow specs."_ The honest framing is that the **underlying technique is not novel** — the value of the packaged skill is a **tested rule set**, **use-case adaptations** (error messages, runbooks, incident reports, release notes, AGENTS.md itself), and a **reproducible benchmark**, not a capability unavailable any other way.

**skissane**'s comment on the broader "are skills cruft" question generalizes well beyond this specific repo: skills earn their keep through an **iterative loop** — create a skill for a task, watch the agent fail, update the skill to prevent that exact failure again. A skill that's never been through that loop is closer to a static prompt with extra packaging.

----------

## Not just docs — where else STE applies

The skill ships adaptations beyond README generation:


| Surface | STE fix |
| --- | --- |
| Error messages | What happened → why → what to do, in that order |
| Runbooks | STE's original home turf — a runbook is a maintenance manual |
| Incident reports | Simple past tense kills "we have identified an issue that may have impacted" |
| Release notes | Command first, risk second — breaking changes read as warnings |
| AGENTS.md / system prompts | A system prompt is a procedure for a reader that can't ask questions — models read "should" as optional; STE bans "should" |
| Translation prep | STE's original 1983 job — readable for non-native speakers, cheap to localize |

The skill explicitly **refuses** to touch marketing copy, blog voice, or brand writing — "flat on purpose." That scoping is deliberate: STE trades expressiveness for unambiguity, which is the wrong trade for anything meant to persuade rather than instruct.

----------

## Origin story: why now, and why aerospace

The skill's popularity this week traces back to a viral X post ([@geogristle](https://x.com/geogristle?ref=explainx)) surfacing ASD-STE100 as an antidote to increasingly verbose model output — several HN commenters noted new frontier models (Opus 5 in particular) had grown noticeably harder to parse in prose form even as their coding ability improved, echoing the same "smart but unintelligible" complaint that shows up across 2026 AI-writing discourse.

Aerospace is a deliberate source for the rules, not an arbitrary one. ASD-STE100 was written in 1983 for readers who **cannot afford to misread an instruction** — aircraft maintenance technicians working in a second language, under time pressure, on safety-critical procedures. That constraint produced a rule set optimized purely for unambiguous comprehension, with zero regard for tone, brand voice, or persuasion — which happens to be exactly the failure mode of LLM-generated technical writing: fluent, hedged, and marketing-adjacent by default, at the expense of the plain declarative sentences a tired reader actually needs.

----------

## Should you install it?


| Use it if | Skip it if |
| --- | --- |
| You maintain shared CLAUDE.md / AGENTS.md docs across a team and want consistent, tested rules rather than everyone's own hand-tuned prompt | You already have a working one-line instruction and don't need the packaged rule set |
| You want error messages and incident reports that read like real incidents, not apology templates | You're writing marketing copy, landing pages, or blog voice — explicitly out of scope |
| You care about reproducible measurement before adopting a writing convention | You're fine trusting vibes over a benchmark |

For teams building on **[agent skills](https://explainx.ai/blog/what-are-agent-skills-complete-guide)** generally, this is a good case study in what separates a skill worth installing from one that's "cruft": a **measured before/after**, a **stated scope**, and **honest FAQ answers** about where the technique overlaps with simpler alternatives.

----------

## Summary

**AminBlg/SimpleEnglish** packages **ASD-STE100** — a 1983 aerospace controlled-English standard — as an installable agent skill for Claude Code, Cursor, Codex, and ~25 other harnesses. Measured results: **72.9% fewer** style-rule violations per 100 words, averaged across **6 Claude models and 8 writing tasks**, with output tokens dropping on every model tested. The strongest HN pushback — that a single system-prompt line does most of the same work — is fair and the repo's own FAQ mostly agrees; the skill's real value is a **tested rule set and reproducible benchmark**, not a technique unavailable elsewhere. It explicitly stays out of marketing and blog voice, targeting docs, error messages, runbooks, and incident reports instead.

