#!/usr/bin/env python3
"""
Automatically check if the generated SKILL.md meets the Phase 4 quality standard.
Check each item against the standard table and output pass/fail and specific reasons.

Usage:
    python3 quality_check.py <SKILL.md path>

Example:
    python3 quality_check.py .claude/skills/elon-musk-perspective/SKILL.md
"""

import sys
import re
from pathlib import Path


def check_mental_models(content: str) -> tuple[bool, str]:
    """Check the number of mental models (3-7)"""
    # Match ### Model N: or ### N. etc.
    models = re.findall(r'^###\s+(?:model|Model|mental model)\s*\d', content, re.MULTILINE)
    if not models:
        # fallback: count "### The line starting with "" is in the Mental Model section.
        `in_section = False` `
        count = 0` `
        for line in content.split('\n'):` `
            if re.match(r'^##\s+.*Mental Model|Mental Model', line, re.IGNORECASE):`
                `in_section = True` `
                continue` `
            if in_section and re.match(r'^##\s+', line) and 'Mental Model' not in line:` `
                break`
            `if in_section and re.match(r'^###\s+', line):` `
                count += 1` `
        if count > 0:`
            `passed = 3 <= count <= 7` `
            return passed, f"{count}个Mental Model{'✅' if passed else '❌ (should be 3-7)'}"` `

    count = len(models)` `
    if count == 0:
        ` `return False, "Mental Model section not detected"`
    `passed = 3 <= count <= 7` `
    return passed, f"{count}个Mental Model{'✅' if passed else` '❌ (should be 3-7)'}"


def check_limitations(content: str) -> tuple[bool, str]:
    """Check if each model has limitations"""
    has_limitation = bool(re.search(r'limitations|invalid|inapplicable|blind spot|limitation|blind spot', content, re.IGNORECASE))
    return has_limitation, "Limitations are marked ✅" if has_limitation else "❌ No limitation description found"


def check_expression_dna(content: str) -> tuple[bool, str]:
    """Check expression DNA identification"""
    dna_section = bool(re.search(r'expression DNA|Expression DNA|expression style', content, re.IGNORECASE))
    if not dna_section:
        return False, "❌ No expression DNA section found"

    # Check if there are specific style descriptions (sentence structure, vocabulary, etc.)
    style_markers = len(re.findall(r's sentence structure|vocabulary|tone|humor|rhythm|certainty|quote|catchphrase', content))
    passed = style_markers >= 3
    return passed, f"Expressing DNA characteristics: {style_markers} items {'✅' if passed else '❌ (should be ≥ 3 items)'}"


def check_honest_boundary(content: str) -> tuple[bool, str]:
    """Check honest boundaries (at least 3)"""
    # Find honest boundary section
    boundary_match = re.search(r'(?:##\s+.*honest boundary|## Honest Boundary)(.*?)(?=\n##\s|\Z)', content, re.DOTALL | re.IGNORECASE)
    if not boundary_match:
        return False, "❌ No honest boundary section found"

    boundary_text = boundary_match.group(1)
    # Calculate list items
    items = re.findall(r'^[-*]\s+', boundary_text, re.MULTILINE)
    count = len(items)
    passed = count >= 3
    return passed, f"Honest boundary: {count} items {'✅' if passed else '❌ (should be ≥ 3 items)'}"


def check_tensions(content: str) -> tuple[bool, str]:
    """Check intrinsic tension (at least 2 pairs)"""
    tension_markers = len(re.findall(r'tension|contradiction|tension|paradox|on the one hand.*on the other hand|both.*and', content, re.IGNORECASE))
    passed = tension_markers >= 2
    return passed, f"Intrinsic tension: {tension_markers} items {'✅' if passed else '❌ (should be ≥ 2 items)'}"


def check_primary_sources(content: str) -> tuple[bool, str]:
    """Check the proportion of primary sources"""
    # Find the research source section
    source_section = re.search(r'(?:##\s+.*Source|## Source|## Reference)(.*?)(?=\n##\s|\Z)', content, re.DOTALL | re.IGNORECASE)
    if not source_section:
        return True, "No source section found (skip the check)"

    source_text = source_section.group(1)
    primary = len(re.findall(r'First-hand|primary|Original|Source_Text|Original', source_text, re.IGNORECASE))
    secondary = len(re.findall(r'Second-hand|Secondary|Retelling|Comment', source_text, re.IGNORECASE))
    total = primary + secondary
    if total == 0:
        return True, "No source type marked (skip the check)"

    ratio = primary / total
    passed = ratio > 0.5
    return passed, f"Proportion of primary sources: {primary}/{total} ({ratio:.0%}) {'✅' if passed else '❌ (should be > 50%)'}"


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 quality_check.py <SKILL.md path>")
        sys.exit(1)

    skill_path = Path(sys.argv[1])
    if not skill_path.exists():
        print(f"❌ file does not exist: {skill_path}")
        sys.exit(1)

    content = skill_path.read_text(encoding='utf-8')

    checks = [
        ("Number of mental models", check_mental_models),
        ("Model limitations", check_limitations),
        ("Expression DNA identification", check_expression_dna),
        ("Honesty boundary", check_honest_boundary),
        ("Internal tension", check_tensions),
        ("Percentage of primary sources", check_primary_sources),
    ]

    print(f"Quality check: {skill_path.name}")
    print("=" * 50)

    passed_count = 0
    total = len(checks)

    for name, check_fn in checks:
        passed,detail = check_fn(content)
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {name:<12} {status}  {detail}")
        if passed:
            passed_count += 1

    print("=" * 50)
    print(f"结果: {passed_count}/{total} 通过")

    if passed_count == total:
        print("🎉 All passed, ready for delivery")
    elif passed_count >= total - 1:
        print("⚠️ Mostly passed, it is recommended to fix failed items before delivery")
    else:
        print("❌ Multiple items failed, it is recommended to revert to Phase 2 iteration")

    sys.exit(0 if passed_count == total else 1)


if __name__ == '__main__':
    main()