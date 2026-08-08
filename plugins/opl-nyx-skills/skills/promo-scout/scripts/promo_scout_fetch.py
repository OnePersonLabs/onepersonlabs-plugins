#!/usr/bin/env python3
"""promo-scout fetch — GENERIC live-state grabber (deterministic, no hardcoded repos).

Pulls current GitHub state for ANY target(s) so a consensus pass (sshx) can judge what is
promotable / how it connects / what is unverifiable. Works on an org (enumerates repos) or
explicit owner/repo targets. Emits one bundle JSON for the consensus step to consume.

Usage (runs from anywhere — absolute path, no cd needed):
  python3 <path>/promo_scout_fetch.py example-org                 # one org, public repos by default
  python3 <path>/promo_scout_fetch.py example-org/example-repo    # one repo
  python3 <path>/promo_scout_fetch.py --include-private example-org/example-repo  # private opt-in
  REPO_LIMIT=20 python3 <path>/promo_scout_fetch.py example-org   # cap org repos
"""
import subprocess, sys, json, base64, os

REPO_LIMIT = int(os.environ.get("REPO_LIMIT", "12"))   # for org targets, cap to N most-recently-updated repos
OUT = os.environ.get("PROMO_FETCH_OUT", "/tmp/promo_scout_bundle.json")
PRIVATE_DENIED = "private repo metadata requires explicit --include-private confirmation"

def gh(args):
    r = subprocess.run(["gh"] + args, capture_output=True, text=True)
    if r.returncode != 0:
        msg = (r.stderr or r.stdout or "").strip()
        raise RuntimeError(f"gh {' '.join(args)} failed with exit {r.returncode}: {msg}")
    return r.stdout

def gh_json(path):
    out = gh(["api", path])
    if not out.strip():
        raise RuntimeError(f"gh api {path} returned empty output")
    try:
        return json.loads(out)
    except Exception as exc:
        raise RuntimeError(f"gh api {path} returned invalid JSON") from exc

def repo_visibility(repo):
    data = gh_json(f"repos/{repo}")
    if not isinstance(data, dict):
        raise RuntimeError(f"gh api repos/{repo} returned non-object JSON")
    return data.get("visibility") or ("private" if data.get("private") else "public")

def readme(repo):
    out = gh(["api", f"repos/{repo}/readme", "--jq", ".content"])
    if not out.strip(): return ""
    try: return base64.b64decode(out).decode("utf-8", "replace")
    except Exception: return ""

def repo_state(repo, include_private=False):
    visibility = repo_visibility(repo)
    if visibility != "public" and not include_private:
        raise RuntimeError(f"{repo}: {PRIVATE_DENIED}")
    commits = gh_json(f"repos/{repo}/commits?per_page=15") or []
    releases = gh_json(f"repos/{repo}/releases?per_page=5") or []
    pulls = gh_json(f"repos/{repo}/pulls?state=open&per_page=10") or []
    issues = gh_json(f"repos/{repo}/issues?state=all&sort=updated&per_page=10") or []
    rd = readme(repo)
    return {
        "repo": repo,
        "visibility": visibility,
        "readme_head": "\n".join(rd.splitlines()[:80]),
        "recent_commits": [f"{c.get('commit',{}).get('committer',{}).get('date','')[:10]} {c.get('commit',{}).get('message','').splitlines()[0][:120]}" for c in commits if isinstance(c, dict)][:15],
        "releases": [f"{r.get('tag_name','')} {r.get('published_at','')[:10]} {r.get('name','')}" for r in releases if isinstance(r, dict)][:5],
        "open_prs": [f"#{p.get('number')} {p.get('title','')[:100]}" for p in pulls if isinstance(p, dict)][:10],
        "recent_issues": [f"#{i.get('number')} [{i.get('state')}] {i.get('title','')[:100]}" for i in issues if isinstance(i, dict) and 'pull_request' not in i][:10],
    }

def parse_args(argv):
    include_private = False
    targets = []
    for arg in argv:
        if arg == "--include-private":
            include_private = True
        else:
            targets.append(arg)
    if not targets:
        raise SystemExit("usage: promo_scout_fetch.py [--include-private] <org | owner/repo> [more...]")
    if any(t.lower() in ("me", "@me", "all") for t in targets):
        raise SystemExit("account-wide targets are disabled; name an explicit org or owner/repo")
    return include_private, targets

def resolve_targets(args, include_private=False):
    """Each arg is 'owner/repo' or an org. Org targets list public repos unless include_private is true."""
    repos = []
    for a in args:
        a = a.strip().rstrip("/")
        if "/" in a:
            repos.append(a)
        else:
            visibility_args = [] if include_private else ["--visibility", "public"]
            out = gh(["repo", "list", a, "--no-archived", "--limit", "100",
                      "--json", "name,updatedAt"] + visibility_args)
            if not out.strip():
                raise RuntimeError(f"gh repo list {a} returned empty output")
            try:
                lst = json.loads(out)
            except Exception as exc:
                raise RuntimeError(f"gh repo list {a} returned invalid JSON") from exc
            if not isinstance(lst, list):
                raise RuntimeError(f"gh repo list {a} returned non-list JSON")
            lst.sort(key=lambda x: x.get("updatedAt",""), reverse=True)
            repos += [f"{a}/{r['name']}" for r in lst[:REPO_LIMIT]]
    # dedupe, preserve order
    seen=set(); ordered=[]
    for r in repos:
        if r not in seen: seen.add(r); ordered.append(r)
    if not ordered:
        raise RuntimeError("no repositories resolved for the requested explicit target(s)")
    return ordered

if __name__ == "__main__":
    include_private, targets_in = parse_args(sys.argv[1:])
    repos = resolve_targets(targets_in, include_private=include_private)
    bundle = {"targets_requested": targets_in, "include_private": include_private, "repos_resolved": repos, "repo_limit_per_org": REPO_LIMIT, "state": []}
    for r in repos:
        bundle["state"].append(repo_state(r, include_private=include_private))
    with open(OUT, "w") as f:
        json.dump(bundle, f, ensure_ascii=False, indent=2)
    print(f"[promo-fetch] targets={targets_in} repos={len(repos)} -> {OUT}")
    print("  repos:", ", ".join(repos))
