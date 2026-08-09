#!/usr/bin/env python3
"""Lint prose for mechanical Simplified Technical English violations."""

from __future__ import annotations

import argparse
import fnmatch
import glob
import json
import re
import sys
from pathlib import Path
from typing import Iterable

VERSION = "0.1.0"
DOCUMENT_EXTENSIONS = {
    ".adoc", ".asciidoc", ".cfg", ".conf", ".ini", ".json", ".md",
    ".mdx", ".rst", ".text", ".toml", ".txt", ".xml", ".yaml", ".yml",
}
DEFAULT_IGNORED_PARTS = {".git", "node_modules"}
MARKETING = [
    "seamless", "seamlessly", "robust", "powerful", "cutting-edge",
    "effortless", "effortlessly", "world-class", "next-generation",
    "revolutionary", "blazing", "lightning-fast", "elegant", "delightful",
    "turnkey", "best-in-class", "state-of-the-art", "game-changing",
    "first-class", "battle-tested", "enterprise-grade", "supercharge",
    "unlock", "unleash", "empower", "empowers",
]
BANNED = [
    "begin", "begins", "commence", "commences", "initiate", "initiates",
    "originate", "utilize", "utilizes", "utilizing", "leverage", "leverages",
    "leveraging", "facilitate", "facilitates", "ensure", "ensures", "ensuring",
    "prior to", "subsequent to", "obtain", "obtains", "acquire", "acquires",
    "demonstrate", "demonstrates", "additionally", "furthermore", "moreover",
    "comprehensive", "comprehensively", "utilization", "aforementioned",
    "henceforth", "therein", "whilst", "amongst", "numerous", "myriad",
    "plethora", "in order to", "a variety of", "in the event that",
    "due to the fact that", "it is important to note",
]
PHRASAL = [
    "spin up", "spin down", "reach out", "dive into", "dives into",
    "diving into", "kick off", "kicks off", "roll out", "rolls out",
    "tear down", "ramp up", "circle back", "drill down", "spun up",
    "reaching out",
]
MODAL_HEDGE = [
    "it is important to note", "it should be noted", "it is worth noting",
    "please note that", "as mentioned", "as noted above",
]
BE = r"(?:am|is|are|was|were|be|been|being)"
PP_IRREG = r"(?:done|made|sent|read|built|kept|held|set|put|run|written|shown|given|taken|found|got|gotten|seen|known|thrown|drawn)"


class CliError(Exception):
    """Report an ESLint-style operational error."""


def strip_code(text: str) -> str:
    def blank(match: re.Match[str]) -> str:
        return "".join("\n" if char == "\n" else " " for char in match.group(0))

    text = re.sub(r"```.*?```", blank, text, flags=re.S)
    return re.sub(r"`[^`]*`", blank, text)


def sentence_entries(text: str) -> list[tuple[str, int]]:
    entries: list[tuple[str, int]] = []
    for line_number, line in enumerate(text.split("\n"), 1):
        value = re.sub(r"^\s*#{1,6}\s*", "", line.strip())
        value = re.sub(r"^\s*(?:[-*+]|\d+[.)])\s+", "", value)
        for part in re.split(r"(?<=[.!?:])\s+(?=[A-Z0-9\"'\-])", value):
            if part.strip():
                entries.append((part.strip(), line_number))
    return entries


def word_count(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9][A-Za-z0-9'\-/]*", text))


def phrase_matches(text: str, phrases: Iterable[str]):
    lowered = text.lower()
    for phrase in phrases:
        pattern = r"(?<![a-z])" + re.escape(phrase) + r"(?![a-z])"
        for match in re.finditer(pattern, lowered):
            yield match, phrase


def source_detail(raw: str, start: int, end: int, rule: str, matched: str | None = None) -> dict:
    line_start = raw.rfind("\n", 0, start) + 1
    line_end = raw.find("\n", end)
    if line_end == -1:
        line_end = len(raw)
    source = raw[line_start:line_end].strip()
    return {
        "rule": rule,
        "line": raw.count("\n", 0, start) + 1,
        "column": start - line_start + 1,
        "match": (matched if matched is not None else raw[start:end]).strip(),
        "source": source[:157] + "..." if len(source) > 160 else source,
    }


def line_detail(raw: str, line_number: int, rule: str, matched: str = "") -> dict:
    lines = raw.split("\n")
    index = max(0, min(line_number - 1, len(lines) - 1))
    source = lines[index].strip()
    return {
        "rule": rule, "line": index + 1, "column": 1, "match": matched,
        "source": source[:157] + "..." if len(source) > 160 else source,
    }


def lint(text: str) -> dict:
    raw = text
    clean = strip_code(text)
    entries = sentence_entries(clean)
    sentences = [sentence for sentence, _ in entries]
    words = sum(word_count(sentence) for sentence in sentences) or 1
    violations: dict[str, int] = {}
    details: list[dict] = []

    long_sentences = [(word_count(sentence), sentence) for sentence in sentences if word_count(sentence) > 20]
    violations["long_sentence(>20w)"] = len(long_sentences)
    details.extend(line_detail(raw, line, "long_sentence(>20w)", sentence)
                   for sentence, line in entries if word_count(sentence) > 20)

    simple_rules = {
        "semicolon": list(re.finditer(";", clean)),
        "contraction": list(re.finditer(r"\b\w+['’](?:t|re|ve|ll|d|s|m)\b", clean)),
        "passive_voice": list(re.finditer(rf"\b{BE}\s+(?:\w+ed|{PP_IRREG})\b", clean, re.I)),
        "ing_main_verb": list(re.finditer(rf"\b{BE}\s+\w+ing\b", clean, re.I)),
    }
    nominalizations = list(re.finditer(
        r"\b(?:perform(?:s|ed)?|conduct(?:s|ed)?|provide(?:s|d)?|carry out|carries out|make use of|makes use of)\b",
        clean, re.I,
    ))
    nominalizations += list(re.finditer(r"\b\w{4,}(?:tion|ment|ance|ence)\s+of\b", clean, re.I))
    simple_rules["nominalization"] = nominalizations
    for rule, matches in simple_rules.items():
        violations[rule] = len(matches)
        details.extend(source_detail(raw, match.start(), match.end(), rule) for match in matches)

    phrase_rules = {
        "phrasal_verb": list(phrase_matches(clean, PHRASAL)),
        "banned_word": list(phrase_matches(clean, BANNED)),
        "marketing_adjective": list(phrase_matches(clean, MARKETING)),
        "modal_hedge": list(phrase_matches(clean, MODAL_HEDGE)),
    }
    for rule, matches in phrase_rules.items():
        violations[rule] = len(matches)
        details.extend(source_detail(raw, match.start(), match.end(), rule, phrase)
                       for match, phrase in matches)

    paragraphs = [part for part in re.split(r"\n\s*\n", raw) if part.strip()]
    violations["long_paragraph(>6s)"] = sum(
        1 for paragraph in paragraphs if len(sentence_entries(strip_code(paragraph))) > 6
    )
    for paragraph in re.finditer(r"\S.*?(?=\n\s*\n|\Z)", raw, re.S):
        if len(sentence_entries(strip_code(paragraph.group(0)))) > 6:
            details.append(source_detail(raw, paragraph.start(), paragraph.start(),
                                         "long_paragraph(>6s)", "(paragraph)"))

    total = sum(violations.values())
    return {
        "words": words,
        "sentences": len(sentences),
        "violations": violations,
        "total": total,
        "details": sorted(details, key=lambda item: (item["line"], item["column"], item["rule"])),
        "total_per100w": round(total * 100.0 / words, 2),
        "em_dash(slop-marker)": raw.count("—") + raw.count("–"),
        "longest_sentence_words": max((word_count(sentence) for sentence in sentences), default=0),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ste-lint",
        description="Lint prose for mechanical ASD-STE100 issues.",
        usage="ste-lint [options] file [file ...] [dir]",
    )
    parser.add_argument("patterns", nargs="*", metavar="file")
    parser.add_argument("--ignore-pattern", action="append", default=[], metavar="String",
                        help="Pattern of files to ignore (repeatable)")
    parser.add_argument("--no-ignore", action="store_true", help="Disable default and custom ignores")
    fixes = parser.add_mutually_exclusive_group()
    fixes.add_argument("--fix", action="store_true", help="Request in-place fixes through $ste-writing")
    fixes.add_argument("--fix-dry-run", action="store_true",
                       help="Request fixes through $ste-writing without writing files")
    parser.add_argument("-f", "--format", choices=("stylish", "json"), default="stylish")
    parser.add_argument("--ext", action="append", default=[], metavar="String",
                        help="File extension to scan in directories (repeatable)")
    parser.add_argument("--stdin", action="store_true", help="Lint text from stdin")
    parser.add_argument("--stdin-filename", default="<stdin>", metavar="String")
    parser.add_argument("-v", "--version", action="version", version=VERSION)
    return parser


def pattern_matches(relative: str, pattern: str) -> bool:
    normalized = pattern.replace("\\", "/").lstrip("./")
    candidates = (relative, Path(relative).name)
    if any(fnmatch.fnmatch(candidate, normalized) for candidate in candidates):
        return True
    return normalized.startswith("**/") and fnmatch.fnmatch(relative, normalized[3:])


def is_ignored(path: Path, cwd: Path, patterns: list[str], no_ignore: bool) -> bool:
    try:
        relative = path.resolve().relative_to(cwd).as_posix()
    except ValueError:
        relative = path.resolve().as_posix()
    if no_ignore:
        return False
    ignored = any(part in DEFAULT_IGNORED_PARTS for part in path.parts)
    for pattern in patterns:
        negate = pattern.startswith("!")
        candidate = pattern[1:] if negate else pattern
        if candidate and pattern_matches(relative, candidate):
            ignored = not negate
    return ignored


def normalized_extensions(values: list[str]) -> set[str]:
    if not values:
        return DOCUMENT_EXTENSIONS
    return {value if value.startswith(".") else "." + value for item in values for value in item.split(",")}


def collect_files(patterns: list[str], ignores: list[str], no_ignore: bool,
                  extensions: set[str]) -> list[Path]:
    cwd = Path.cwd().resolve()
    found: dict[str, Path] = {}
    missing: list[str] = []
    for item in patterns:
        expanded = [Path(value) for value in glob.glob(item, recursive=True)] if glob.has_magic(item) else [Path(item)]
        existing = [path for path in expanded if path.exists()]
        if not existing:
            missing.append(item)
            continue
        for path in existing:
            if path.is_file():
                if not is_ignored(path, cwd, ignores, no_ignore):
                    found[str(path.resolve())] = path.resolve()
                continue
            if path.is_dir():
                for candidate in path.rglob("*"):
                    if (candidate.is_file() and candidate.suffix.lower() in extensions
                            and not is_ignored(candidate, cwd, ignores, no_ignore)):
                        found[str(candidate.resolve())] = candidate.resolve()
    if missing:
        joined = ", ".join(repr(item) for item in missing)
        raise CliError(f"No files matching {joined} were found.")
    return [found[key] for key in sorted(found)]


def read_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as error:
        raise CliError(f"Cannot read {path}: {error}") from error


def stylish(results: list[dict], fix_mode: str | None) -> str:
    blocks: list[str] = []
    total = 0
    for result in results:
        if not result["total"]:
            continue
        total += result["total"]
        lines = [result["filePath"]]
        for detail in result["details"]:
            match = " ".join((detail.get("match") or "").split())
            lines.append(f"  {detail['line']}:{detail['column']}  error  {match or detail['source']}  {detail['rule']}")
        blocks.append("\n".join(lines))
    if total:
        blocks.append(f"✖ {total} problem{'s' if total != 1 else ''} ({total} errors, 0 warnings)")
        if fix_mode:
            blocks.append(f"{fix_mode} requested: use $ste-writing for the reported prose.")
    return "\n\n".join(blocks)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.stdin and args.patterns:
        parser.error("--stdin cannot be used with file patterns")
    if not args.stdin and not args.patterns:
        parser.error("provide at least one file or directory, or use --stdin")

    try:
        if args.stdin:
            inputs = [(args.stdin_filename, sys.stdin.read())]
        else:
            paths = collect_files(args.patterns, args.ignore_pattern, args.no_ignore,
                                  normalized_extensions(args.ext))
            if not paths:
                raise CliError("All files matched by the patterns were ignored.")
            inputs = [(str(path), read_file(path)) for path in paths]
    except CliError as error:
        print(f"ste-lint: {error}", file=sys.stderr)
        return 2

    results = []
    for file_name, text in inputs:
        result = lint(text)
        result["filePath"] = file_name
        results.append(result)

    fix_mode = "fix" if args.fix else "fix-dry-run" if args.fix_dry_run else None
    if args.format == "json":
        print(json.dumps({"fixMode": fix_mode, "results": results}, indent=2))
    else:
        output = stylish(results, fix_mode)
        if output:
            print(output)
    return 1 if any(result["total"] for result in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
