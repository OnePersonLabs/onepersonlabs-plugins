# Child agent model selection: evidence and limits

This reference explains the starting choices in OPL's always-loaded
`AGENTS.md`. It is evidence for judgment, not a fixed ranking or a quota
calculator. Check current model availability and restrictions before launching.

OpenAI's July 2026 GPT-5.6 evaluations put Sol, Terra, and Luna at 72.7%,
69.6%, and 67.2% on DeepSWE v1.1, but at 64.6%, 63.4%, and 62.7% on
SWE-Bench Pro. The gap depends on the task. OpenAI's August 2026 Astra release
reports 74.1% on DeepSWE and 57.9% on Terminal-Bench 4.0, versus Sol's 72.7%
and 37.3%. Those are reported maxima across effort settings and different
evaluation conditions; they do not prove that Astra low beats Sol high on a
particular repository task. [GPT-5.6 evaluations](https://openai.com/index/gpt-5-6/),
[Astra evaluations](https://openai.com/index/gpt-6-astra/).

A separate August 2026 Codex study retained 210 valid common runs from 294
measured runs. Luna, Terra, and Sol accepted 69/70, 70/70, and 70/70 on the
valid tasks; medium, high, xhigh, and max each passed 42/42. The authors note
that the suite was mostly too easy to separate models and does not establish
defaults for security-critical work, migrations, or unfamiliar repositories.
It supports medium for *bounded, well-checked* work, not an effort ceiling.
[Study and methodology](https://instavar.com/research/agents/gpt-5-6-codex-models-reasoning-levels-benchmark-2026).

OpenAI's [subagent guidance](https://learn.chatgpt.com/docs/agent-configuration/subagents)
recommends medium as a balanced effort, high for tracing complex logic, and
xhigh/max for especially demanding reasoning. Its
[Codex usage guidance](https://help.openai.com/en/articles/11369540) says
allowance use also depends on context, tools, task complexity, and settings.
API token prices are therefore not a reliable conversion to subscription
quota. Compare representative tasks using external acceptance checks, time,
usage, and repair effort before promoting a different default. Terra is a
conditional middle option, not a useless model or a mandatory rung.
