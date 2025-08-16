# rank.py
# ------------------------------------------------------------
# UQ courses → robust prereq extraction (+ incompatibilities)
# → logical AST → prereq graph + ranks + SCC-topo order
#
# Install:
#   pip install httpx lxml networkx pandas
#
# Examples:
#   python rank.py --years 2025 --workers 64 --full-ast
#   python rank.py --years 2025,2024 --prefixes MATH,STAT --workers 96 --full-ast
#   python rank.py --years 2025 --level-range 3000-5000 --workers 64 --full-ast
#
# Outputs (uq_fast/):
#   - courses_raw.csv                (streamed rows)
#   - prereq_structured.json         (streamed JSON object)
#   - edges_basic.csv                (streamed rows)
#   - conflicts.csv                  (streamed rows)
#   - ranks.csv                      (final)
#   - topo_order.csv                 (final)
#   - courses_graph.gexf             (final)
#   - courses_graph_incompat.gexf    (final)
#   - all_courses.txt                (unique seeds)
#   - heartbeat.log                  (periodic status)
# ------------------------------------------------------------

from __future__ import annotations

import argparse
import asyncio
import contextlib
import csv
import sys
import json
import random
import re
import time
import os
from flask import Flask
from flask_cors import CORS
from course import course_bp
from collections import deque
from pathlib import Path
from typing import Any

import httpx
import networkx as nx
import pandas as pd
from lxml import html as LH
from urllib.parse import urlencode


# ============================== Config ==============================

BASE = "https://programs-courses.uq.edu.au/"
OUT = Path("uq_fast")
OUT.mkdir(exist_ok=True)

RAW_CSV = OUT / "courses_raw.csv"
STRUCT_JS = OUT / "prereq_structured.json"
EDGES_CSV = OUT / "edges_basic.csv"
CONFL_CSV = OUT / "conflicts.csv"
RANKS_CSV = OUT / "ranks.csv"
TOPO_CSV = OUT / "topo_order.csv"
GEXF_FULL = OUT / "courses_graph.gexf"
GEXF_INCOMPAT = OUT / "courses_graph_incompat.gexf"
ALL_TXT = OUT / "all_courses.txt"
HEARTBEAT_LOG = OUT / "heartbeat.log"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
    "Referer": BASE,
}

# Regexes
COURSE_LINK_RE = re.compile(r"course\.html\?course_code=([A-Z]{4}\d{4}[A-Z]?)")
COURSE_CODE_RE = re.compile(r"\b([A-Z]{4}\d{4}[A-Z]?)\b")

# ============================== Router ==============================
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
app = Flask(__name__)
CORS(app)
app.register_blueprint(course_bp, url_prefix='/api')

# ============================== Utils ==============================

def jitter(lo: float = 0.01, hi: float = 0.05) -> float:
    """Small random delay for politeness / desynchronization."""
    return random.uniform(lo, hi)


def norm_ws(s: str) -> str:
    """Normalize whitespace to single spaces."""
    return " ".join((s or "").split())


def is_level7(code: str) -> bool:
    """True for postgraduate 7xxx courses (skip per requirements)."""
    return bool(re.match(r"^[A-Z]{4}7", code or ""))


def log(msg: str) -> None:
    """Stdout logging with flush."""
    print(msg, flush=True)


# ======================= Streaming Writers =========================

class StreamingJSONMap:
    """
    Stream a JSON object to disk as `{ "...": {...}, ... }`.
    Useful when you can't hold the whole dict in memory.
    """

    def __init__(self, path: Path):
        self.path = path
        self.f = open(self.path, "w", encoding="utf-8", newline="")
        self.f.write("{\n")
        self.first = True
        self.lock = asyncio.Lock()

    async def write_item(self, key: str, obj: dict[str, Any]) -> None:
        js_key = json.dumps(key, ensure_ascii=False)
        js_val = json.dumps(obj, ensure_ascii=False)
        async with self.lock:
            if not self.first:
                self.f.write(",\n")
            else:
                self.first = False
            self.f.write(f"  {js_key}: {js_val}")
            self.f.flush()

    async def close(self) -> None:
        async with self.lock:
            self.f.write("\n}\n")
            self.f.flush()
            self.f.close()


class StreamingCSV:
    """CSV writer with header that flushes each appended row."""

    def __init__(self, path: Path, header: list[str]):
        self.path = path
        self.f = open(self.path, "w", encoding="utf-8", newline="")
        self.writer = csv.writer(self.f)
        self.writer.writerow(header)
        self.f.flush()
        self.lock = asyncio.Lock()

    async def write_row(self, row: list[Any]) -> None:
        async with self.lock:
            self.writer.writerow(row)
            self.f.flush()

    async def close(self) -> None:
        async with self.lock:
            self.f.flush()
            self.f.close()


# ===================== Token-Bucket Rate Limit =====================

class AsyncTokenBucket:
    """
    Simple token-bucket limiter:
      - rate: tokens per second
      - capacity: max burst tokens
    acquire(n) blocks until at least n tokens are available.
    """

    def __init__(self, rate: float, capacity: int):
        self.rate = max(0.1, float(rate))
        self.capacity = max(1, int(capacity))
        self.tokens = float(self.capacity)
        self.updated = asyncio.get_event_loop().time()
        self.lock = asyncio.Lock()

    async def acquire(self, n: int = 1) -> None:
        while True:
            async with self.lock:
                now = asyncio.get_event_loop().time()
                elapsed = now - self.updated
                self.updated = now
                self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
                if self.tokens >= n:
                    self.tokens -= n
                    return
                need = n - self.tokens
                wait = need / self.rate
            await asyncio.sleep(wait)

    async def cooloff(self, seconds: float) -> None:
        """Force a pause (e.g., after 429/403)."""
        await asyncio.sleep(max(0.0, seconds))


REQUEST_LIMITER: AsyncTokenBucket | None = None


# =========================== HTTP Layer ============================

def client_factory(workers: int, rps: float) -> httpx.AsyncClient:
    """
    Create an HTTPX client with modest connection pools.
    Throughput is governed by the token bucket, not connections.
    """
    max_conns = max(16, min(64, workers))
    max_conns = max(max_conns, int(rps) + 4)
    limits = httpx.Limits(
        max_connections=max_conns,
        max_keepalive_connections=max(8, max_conns // 2),
    )
    return httpx.AsyncClient(
        http2=True,
        headers=HEADERS,
        timeout=httpx.Timeout(30.0, connect=15.0, read=30.0),
        limits=limits,
        transport=httpx.AsyncHTTPTransport(retries=0),
    )


def looks_like_course_html(text: str) -> bool:
    """Quick sanity check for course pages."""
    if not text:
        return False
    return (
        "id=\"course-title\"" in text
        or "id='course-title'" in text
        or "id=\"course-units\"" in text
        or "id='course-units'" in text
    )


async def limited_get(client: httpx.AsyncClient, url: str) -> httpx.Response | None:
    """GET with token-bucket gating."""
    if REQUEST_LIMITER:
        await REQUEST_LIMITER.acquire()
    try:
        return await client.get(url)
    except Exception:
        return None


async def robust_get_text(
    client: httpx.AsyncClient,
    url: str,
    attempts: int = 6,
) -> str | None:
    """
    GET with retry/backoff + rate-limit cooling on 429/403/503.
    """
    delay = 0.4

    for _ in range(attempts):
        r = await limited_get(client, url)
        if r is None:
            await asyncio.sleep(delay + jitter(0.05, 0.15))
            delay = min(delay * 1.7, 3.0)
            continue

        if r.status_code == 200 and r.text:
            return r.text

        if r.status_code in (429, 403, 503):
            ra = r.headers.get("Retry-After")
            if ra and ra.isdigit():
                cool = min(10.0, float(ra))
            else:
                cool = delay

            log(f"[backoff] {r.status_code} on {url} → cooling {cool:.2f}s")
            if REQUEST_LIMITER:
                await REQUEST_LIMITER.cooloff(cool + jitter(0.05, 0.2))
            else:
                await asyncio.sleep(cool + jitter(0.05, 0.2))

            delay = min(delay * 1.9, 6.0)
            continue

        # Other non-200s, just back off a bit and retry
        await asyncio.sleep(delay + jitter(0.05, 0.15))
        delay = min(delay * 1.7, 3.0)

    # Final best-effort try
    r = await limited_get(client, url)
    if r and r.status_code == 200 and r.text:
        return r.text
    return None


# ======================= Harvest via Search ========================

async def search_bucket(
    client: httpx.AsyncClient,
    year: int,
    digit: int,
    prefix: str | None,
) -> set[str]:
    """
    Query UQ search for a bucket like MATH1*** or ****1***.
    Returns a set of course codes found in result HTML.
    """
    kw = f"{prefix}{digit}***" if prefix else f"****{digit}***"
    params = {"searchType": "coursecode", "keywords": kw, "year": str(year)}
    url = f"{BASE}search.html?{urlencode(params)}"

    html = await robust_get_text(client, url)
    if not html:
        return set()

    return {m.group(1) for m in COURSE_LINK_RE.finditer(html)}


async def harvest_codes(
    years: list[int],
    prefixes: list[str] | None,
    workers: int,
    rps: float,
) -> list[str]:
    """Sweep all search buckets and gather unique course codes."""
    jobs = [(y, d, p) for y in years for d in range(10) for p in (prefixes or [None])]
    codes: set[str] = set()

    async with client_factory(workers, rps) as client:
        sem = asyncio.Semaphore(max(4, min(12, workers // 8)))

        async def one(y: int, d: int, p: str | None) -> None:
            async with sem:
                got = await search_bucket(client, y, d, p)
                codes.update(got)

        await asyncio.gather(*(one(y, d, p) for (y, d, p) in jobs))

    return sorted(codes)


# ====================== Course Page + Parsing ======================

def parse_course_page(html_text: str) -> tuple[str, str, str, str, str]:
    """
    Parse a course page; return:
      (title, prereq_raw, incompat_raw, units, summary).
    Robust to various ID typos/variants.
    """
    try:
        doc = LH.fromstring(html_text)
    except Exception:
        return "", "", "", "", ""

    # Title
    title = ""
    node = doc.xpath("//h1[@id='course-title']")
    if node:
        title = norm_ws("".join(node[0].itertext()))
    else:
        h1 = doc.xpath("//h1")
        if h1:
            title = norm_ws("".join(h1[0].itertext()))

    # Prereqs (including recommended variants)
    prereq = ""
    pre_ids = [
        "course-prerequisite",
        "course-prerequisites",
        "course-prequisite",
        "course-recommended-prerequisite",
        "course-recommended-prerequisites",
        "course-recommended-prequisite",
    ]
    for tag in ("div", "p", "section"):
        for cid in pre_ids:
            n = doc.xpath(f"//{tag}[@id='{cid}']")
            if n:
                prereq = norm_ws("".join(n[0].itertext()))
                break
        if prereq:
            break

    if not prereq:
        n = doc.xpath("//*[starts-with(@id,'course-pre') and contains(@id,'requisite')]")
        if n:
            prereq = norm_ws("".join(n[0].itertext()))

    if not prereq:
        n = doc.xpath(
            "//h2[a[contains(.,'Prerequisite')] or contains(.,'Prerequisite')]"
            "/following-sibling::*[self::p or self::div][1]"
        )
        if n:
            prereq = norm_ws("".join(n[0].itertext()))

    # Incompatibilities (typo tolerant)
    incompat = ""
    inc_ids = ["course-incompatible", "course-incompatable"]
    for tag in ("p", "div", "section"):
        for cid in inc_ids:
            n = doc.xpath(f"//{tag}[@id='{cid}']")
            if n:
                incompat = norm_ws("".join(n[0].itertext()))
                break
        if incompat:
            break

    # Units & summary
    units = norm_ws("".join(doc.xpath("string(//*[@id='course-units'])"))) or ""
    summary = norm_ws("".join(doc.xpath("string(//*[@id='course-summary'])"))) or ""

    return title, prereq, incompat, units, summary


async def fetch_course(
    client: httpx.AsyncClient,
    code: str,
    year_hint: int | None = None,
) -> tuple[str, str, str, str, str, str, str]:
    """Fetch + parse one course page; always return a 7-tuple."""
    params = {"course_code": code}
    if year_hint:
        params["year"] = str(year_hint)

    url = f"{BASE}course.html?{urlencode(params)}"
    text = await robust_get_text(client, url)

    if not text:
        return code, url, "", "", "", "", ""

    title, prereq, incompat, units, summary = parse_course_page(text)
    return code, url, title, prereq, incompat, units, summary


# ====================== AST / Text Normalization ===================

def course_node(code: str) -> dict[str, Any]:
    return {"op": "COURSE", "code": code}


def flatten(op: str, args: list[Any]) -> dict[str, Any]:
    """Flatten nested AND/OR and deduplicate COURSE leaves."""
    out = []
    for a in args:
        if isinstance(a, dict) and a.get("op") == op:
            out.extend(a.get("args", []))
        else:
            out.append(a)

    if op in ("AND", "OR"):
        seen: set[Any] = set()
        uniq = []
        for a in out:
            key = ("COURSE", a.get("code")) if isinstance(a, dict) and a.get("op") == "COURSE" else id(a)
            if key in seen:
                continue
            seen.add(key)
            uniq.append(a)
        return {"op": op, "args": uniq}

    return {"op": op, "args": out}


def AND(*xs: Any) -> dict[str, Any]:
    return flatten("AND", [x for x in xs if x])


def OR(*xs: Any) -> dict[str, Any]:
    return flatten("OR", [x for x in xs if x])


def norm_text(t: str) -> str:
    if not t:
        return ""
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"\b[Pp]re[- ]?requisites?\b:?", "", t)
    t = re.sub(r"\b[Pp]re[- ]?requisite\(s\)\b:?", "", t)
    t = re.sub(r"\b[Cc]o[- ]?requisite\(s\)\b:?", "Co-requisite:", t)
    t = t.replace("[", "(").replace("]", ")")
    t = re.sub(r"\band\s*/\s*or\b", "or", t, flags=re.I)
    t = re.sub(r"[+&]", " and ", t)
    t = re.sub(r"([(),])", r" \1 ", t)

    code_pat = r"[A-Z]{4}\d{4}[A-Z]?"
    t = re.sub(rf"({code_pat})\s+or\s+({code_pat})\s*,\s*({code_pat})", r"(\1 or \2) and \3", t)
    t = re.sub(rf"({code_pat})\s+or\s+({code_pat})\s+and\b", r"(\1 or \2) and", t)
    return t.strip()


def parse_units_from(text: str) -> dict[str, Any] | None:
    m = re.search(r"(\d+)\s+units?\s+from\b(.*)", text, re.I)
    if not m:
        return None
    n = int(m.group(1))
    tail = m.group(2)
    codes = sorted(set(COURSE_CODE_RE.findall(tail)))
    return {"op": "UNITS_FROM", "min_units": n, "courses": codes} if codes else None


def parse_level_credits(text: str) -> dict[str, Any] | None:
    m = re.search(r"at least\s+(\d+)\s+units?.*level\s+(\d)\b", text, re.I)
    if not m:
        return None
    return {"op": "CREDITS_AT_LEVEL", "min_units": int(m.group(1)), "level": int(m.group(2))}


def parse_enrolment(text: str) -> dict[str, Any] | None:
    m = re.search(r"\b(enrol(?:ment)?\s+in)\s+([A-Za-z0-9()\-\s]+)", text, re.I)
    if not m:
        return None
    return {"op": "ENROLLED", "program": m.group(2).strip()}


def parse_permission(text: str) -> dict[str, Any] | None:
    if re.search(r"permission\s+of\s+(the\s+)?(course\s+coordinator|head\s+of\s+school)", text, re.I):
        who = "Head of School" if "head of school" in text.lower() else "Course Coordinator"
        return {"op": "PERMISSION", "who": who}
    return None


def _tokenize_bool_expr(t: str) -> list[tuple[str, str | None]]:
    t = re.sub(r"\band\s*/\s*or\b", "or", t, flags=re.I)
    t = re.sub(r"([()])", r" \1 ", t)
    toks: list[tuple[str, str | None]] = []
    for w in t.split():
        wl = w.lower()
        if COURSE_CODE_RE.fullmatch(w):
            toks.append(("CODE", w))
        elif wl == "and":
            toks.append(("AND", None))
        elif wl == "or":
            toks.append(("OR", None))
        elif w == "(":
            toks.append(("LPAREN", None))
        elif w == ")":
            toks.append(("RPAREN", None))
    return toks


def _reduce_op(op: str, vals: list[dict[str, Any]]) -> bool:
    if len(vals) < 2:
        return False
    b = vals.pop()
    a = vals.pop()
    vals.append(AND(a, b) if op == "AND" else OR(a, b))
    return True


def parse_boolean_course_expr(t: str) -> dict[str, Any] | None:
    toks = _tokenize_bool_expr(t)
    if not toks or all(k != "CODE" for k, _ in toks) or all(k not in ("AND", "OR") for k, _ in toks):
        return None

    prec = {"OR": 1, "AND": 2}
    ops: list[str] = []
    vals: list[dict[str, Any]] = []
    prev: str | None = None

    for kind, val in toks:
        if kind == "CODE":
            vals.append(course_node(val or ""))  # val is non-None here
            prev = "CODE"
        elif kind in ("AND", "OR"):
            if prev in (None, "AND", "OR", "LPAREN"):
                return None
            while ops and ops[-1] in prec and prec[ops[-1]] >= prec[kind]:
                if not _reduce_op(ops.pop(), vals):
                    return None
            ops.append(kind)
            prev = kind
        elif kind == "LPAREN":
            ops.append("LPAREN")
            prev = "LPAREN"
        elif kind == "RPAREN":
            if prev in (None, "AND", "OR", "LPAREN"):
                return None
            while ops and ops[-1] != "LPAREN":
                if not _reduce_op(ops.pop(), vals):
                    return None
            if not ops or ops[-1] != "LPAREN":
                return None
            ops.pop()
            prev = "RPAREN"

    if prev in (None, "AND", "OR", "LPAREN"):
        return None

    while ops:
        if ops[-1] == "LPAREN":
            return None
        if not _reduce_op(ops.pop(), vals):
            return None

    return vals[0] if len(vals) == 1 else None


def _or_to_nof1(node: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(node, dict):
        return node
    op = node.get("op")
    if op == "OR":
        return {"op": "N_OF", "n": 1, "args": [_or_to_nof1(a) for a in node.get("args", [])]}
    if op == "AND":
        return {"op": "AND", "args": [_or_to_nof1(a) for a in node.get("args", [])]}
    if op == "N_OF":
        return {"op": "N_OF", "n": node.get("n"), "args": [_or_to_nof1(a) for a in node.get("args", [])]}
    return node


def parse_clause(text: str) -> dict[str, Any] | None:
    t = text.strip()
    if not t:
        return None

    node = parse_boolean_course_expr(t)
    if node:
        return _or_to_nof1(node)

    for f in (parse_units_from, parse_level_credits, parse_enrolment, parse_permission):
        node = f(t)
        if node:
            return node

    if re.search(r"\b(one|any)\s+of\b|\beither\b", t, re.I):
        codes = sorted(set(COURSE_CODE_RE.findall(t)))
        return {"op": "N_OF", "n": 1, "args": [course_node(c) for c in codes]} if codes else None

    if re.search(r"\bboth\s+of\b", t, re.I):
        codes = sorted(set(COURSE_CODE_RE.findall(t)))
        return {"op": "N_OF", "n": 2, "args": [course_node(c) for c in codes]} if codes else None

    if re.search(r"\bor\b", t, re.I):
        codes = sorted(set(COURSE_CODE_RE.findall(t)))
        return _or_to_nof1(OR(*[course_node(c) for c in codes])) if codes else None

    if re.search(r"\band\b", t, re.I):
        codes = sorted(set(COURSE_CODE_RE.findall(t)))
        return AND(*[course_node(c) for c in codes]) if codes else None

    codes = sorted(set(COURSE_CODE_RE.findall(t)))
    if codes:
        return AND(*[course_node(c) for c in codes])

    return {"op": "TEXT", "text": t}


def combine_clauses(clauses: list[dict[str, Any] | None]) -> dict[str, Any] | None:
    clean = [c for c in clauses if c]
    if not clean:
        return None
    return clean[0] if len(clean) == 1 else AND(*clean)


def parse_prereq_text(raw: str) -> dict[str, Any]:
    if not raw:
        return {"prereq": None, "coreq": None, "raw": ""}

    text = norm_text(raw)
    coreq_part = None

    m = re.search(r"\bco-?requisite(?:\(s\))?:\s*(.*)$", text, re.I)
    if m:
        coreq_part = m.group(1)
        text = text[: m.start()].strip()

    parts = re.split(r"\.\s+|;\s+", text)
    prereq_nodes = [parse_clause(p) for p in parts if p.strip()]

    coreq_node = None
    if coreq_part:
        coreq_parts = re.split(r"\.\s+|;\s+", coreq_part)
        coreq_nodes = [parse_clause(p) for p in coreq_parts if p.strip()]
        coreq_node = combine_clauses(coreq_nodes)

    return {"prereq": combine_clauses(prereq_nodes), "coreq": coreq_node, "raw": raw.strip()}


def parse_incompat_text(raw: str) -> dict[str, Any] | None:
    if not raw:
        return None
    codes = sorted(set(COURSE_CODE_RE.findall(raw)))
    if not codes:
        return None
    return {"op": "NONE_OF", "args": [course_node(c) for c in codes], "raw": raw.strip()}


def collect_codes_from_ast(node: dict[str, Any] | None) -> set[str]:
    if not isinstance(node, dict):
        return set()

    op = node.get("op")
    if op == "COURSE":
        return {node["code"]}
    if op in ("AND", "OR", "N_OF"):
        out: set[str] = set()
        for a in node.get("args", []):
            out |= collect_codes_from_ast(a)
        return out
    if op == "UNITS_FROM":
        return set(node.get("courses") or [])
    return set()


# =========================== Graph Helpers =========================

def build_graph(edges_pairs: set[tuple[str, str]]) -> nx.DiGraph:
    """
    Build a DiGraph of prereq -> course from pairs (course, prereq).
    Self-loops are skipped.
    """
    G = nx.DiGraph()
    for (course, prereq) in edges_pairs:
        if course and prereq and course != prereq:
            G.add_edge(prereq, course)
    return G


def condensation_longest_levels(G: nx.DiGraph) -> tuple[dict[str, int], dict[str, int], dict[int, int], nx.DiGraph]:
    """SCC condensation + longest-path 'level' per node."""
    sccs = list(nx.strongly_connected_components(G))

    node_to_scc: dict[str, int] = {}
    for i, comp in enumerate(sccs):
        for n in comp:
            node_to_scc[n] = i

    scc_sizes = {i: len(comp) for i, comp in enumerate(sccs)}
    CG = nx.condensation(G, scc=sccs)
    topo = list(nx.topological_sort(CG))

    scc_level = {s: 0 for s in topo}
    for u in topo:
        for v in CG.successors(u):
            scc_level[v] = max(scc_level[v], scc_level[u] + 1)

    level = {n: scc_level[node_to_scc[n]] for n in G.nodes()}
    return level, node_to_scc, scc_sizes, CG


def export_topological_order(
    CG: nx.DiGraph,
    node_to_scc: dict[str, int],
    level: dict[str, int],
    out_csv: Path,
) -> None:
    """
    Flatten SCC-topological order into a per-node CSV:
      order, course, scc_id, level, scc_size
    """
    order_rows: list[dict[str, Any]] = []
    topo_scc = list(nx.topological_sort(CG))
    rank = 0

    scc_to_nodes: dict[int, list[str]] = {}
    for n, scc in node_to_scc.items():
        scc_to_nodes.setdefault(scc, []).append(n)

    for scc in topo_scc:
        nodes = sorted(scc_to_nodes.get(scc, []))
        for n in nodes:
            order_rows.append(
                {
                    "order": rank,
                    "course": n,
                    "scc_id": scc,
                    "level": level.get(n, 0),
                    "scc_size": len(nodes),
                }
            )
            rank += 1

    pd.DataFrame(order_rows).to_csv(out_csv, index=False, encoding="utf-8")


# ============================== Pipeline ===========================

async def run(
    years: list[str],
    prefixes: list[str] | None,
    workers: int,
    level_range: tuple[int, int] | None,
    want_ast: bool,
    want_rank: bool,  # kept for API symmetry
    rps: float,
    burst: int,
) -> None:
    # Normalize CLI inputs
    years_int = [int(y) for y in years]
    prefixes_norm = [p.strip().upper() for p in prefixes] if prefixes else None

    # Global rate limiter
    global REQUEST_LIMITER
    REQUEST_LIMITER = AsyncTokenBucket(rate=rps, capacity=burst)

    log(
        f"[cfg] years={years_int} prefixes={prefixes_norm} workers={workers} "
        f"rps={rps} burst={burst}"
    )

    # -------- 1) Harvest seeds --------
    log("[harvest] sweeping search buckets…")
    seeds = await harvest_codes(
        years_int,
        prefixes_norm,
        workers=max(4, min(workers, 64)),
        rps=rps,
    )

    # Filter seeds
    seeds = [c for c in seeds if not is_level7(c)]
    if level_range:
        lo, hi = level_range
        seeds = [c for c in seeds if c[4:8].isdigit() and lo <= int(c[4:8]) <= hi]

    log(f"[harvest] initial codes: {len(seeds)}")
    ALL_TXT.write_text("\n".join(seeds), encoding="utf-8")

    # -------- 2) Crawl pages & recurse via prereq refs --------
    seen: set[str] = set()
    queue: deque[str] = deque(seeds)
    results: dict[str, tuple[str, str, str, str, str]] = {}  # code -> (url, title, raw_pr, raw_inc, units)

    raw_writer = StreamingCSV(RAW_CSV, ["course_code", "url", "title", "prereq_raw", "incompat_raw"])
    edges_writer = StreamingCSV(EDGES_CSV, ["course", "prereq"])
    confl_writer = StreamingCSV(CONFL_CSV, ["course", "conflict_with"])
    struct_writer = StreamingJSONMap(STRUCT_JS) if want_ast else None

    prereq_edges: set[tuple[str, str]] = set()
    conflict_pairs: set[tuple[str, str]] = set()

    year_hint = max(years_int) if years_int else None

    # Crawl concurrency (decoupled from RPS limiter)
    crawl_concurrency = max(6, min(32, workers // 4))

    # Heartbeat
    start_ts = time.time()
    hb_stop = False

    async def heartbeat() -> None:
        """Periodic status to stdout + heartbeat.log."""
        while not hb_stop:
            await asyncio.sleep(5.0)
            elapsed = time.time() - start_ts
            msg = (
                f"[hb] t+{elapsed:6.1f}s seen={len(seen):5d} "
                f"done={len(results):5d} queued={len(queue):5d} "
                f"edges={len(prereq_edges):6d} conflicts={len(conflict_pairs):6d} "
                f"(cc={crawl_concurrency}, rps={rps}, burst={burst})"
            )
            log(msg)
            with contextlib.suppress(Exception):
                with open(HEARTBEAT_LOG, "a", encoding="utf-8") as hb:
                    hb.write(msg + "\n")

    async with client_factory(workers, rps) as client:
        sem = asyncio.Semaphore(crawl_concurrency)
        hb_task = asyncio.create_task(heartbeat())

        try:
            while queue:
                # Build a batch; limiter + sem will pace it
                batch: list[str] = []
                cap = max(200, min(800, workers * 3))
                while queue and len(batch) < cap:
                    c = queue.pop()
                    if c in seen:
                        continue
                    seen.add(c)
                    batch.append(c)

                if not batch:
                    break

                async def one(code: str):
                    async with sem:
                        return await fetch_course(client, code, year_hint)

                tasks = [one(c) for c in batch]

                # Consume as they complete to keep memory small
                async for coro in _as_completed_iter(tasks):
                    code, url, title, raw_pr, raw_inc, units, summary = await coro

                    results[code] = (url, title, raw_pr, raw_inc, units)
                    await raw_writer.write_row([code, url, title, raw_pr, raw_inc])

                    parsed = parse_prereq_text(raw_pr)
                    inc_ast = parse_incompat_text(raw_inc)

                    if want_ast and struct_writer:
                        obj = {
                            **parsed,
                            "incompat": inc_ast,
                            "units": units,
                            "summary": summary,
                        }
                        await struct_writer.write_item(code, obj)

                    # Recurse into referenced courses (from prereq/coreq), skipping level-7
                    for node in (parsed["prereq"], parsed["coreq"]):
                        for nxt in collect_codes_from_ast(node):
                            if nxt not in seen and not is_level7(nxt):
                                queue.append(nxt)

                    # Stream edges
                    course_edges: set[tuple[str, str]] = set()
                    for node in (parsed["prereq"], parsed["coreq"]):
                        for p in collect_codes_from_ast(node):
                            if not is_level7(p):
                                course_edges.add((code, p))
                    for c, p in sorted(course_edges):
                        if (c, p) not in prereq_edges:
                            prereq_edges.add((c, p))
                            await edges_writer.write_row([c, p])

                    # Stream incompatibility pairs (as undirected → two directed rows)
                    if isinstance(inc_ast, dict) and inc_ast.get("op") == "NONE_OF":
                        codes = [
                            x.get("code")
                            for x in inc_ast.get("args", [])
                            if isinstance(x, dict) and x.get("op") == "COURSE"
                        ]
                        for a in codes:
                            if a and a != code and not is_level7(a):
                                pair = tuple(sorted([code, a]))
                                if pair not in conflict_pairs:
                                    conflict_pairs.add(pair)
                                    await confl_writer.write_row([pair[0], pair[1]])
                                    await confl_writer.write_row([pair[1], pair[0]])

                await asyncio.sleep(jitter(0.05, 0.15))
                log(f"[crawl] seen={len(seen)} queue={len(queue)} (cc={crawl_concurrency})")

        finally:
            # stop heartbeat promptly
            hb_stop = True
            hb_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await hb_task

    # Close streaming writers
    await raw_writer.close()
    await edges_writer.close()
    await confl_writer.close()
    if want_ast and struct_writer:
        await struct_writer.close()

    # -------- 5) Graph, ranks, topo --------
    G = build_graph(prereq_edges)
    if len(G) == 0:
        log("[rank] graph empty; nothing to rank/sort")
        return

    level, node_to_scc, scc_sizes, CG = condensation_longest_levels(G)
    indeg = dict(G.in_degree())
    outdeg = dict(G.out_degree())

    try:
        pr = nx.pagerank(G, alpha=0.85, max_iter=100)
    except Exception:
        pr = {n: 0.0 for n in G.nodes()}

    rows = []
    for n in G.nodes():
        rows.append(
            {
                "course": n,
                "level": level.get(n, 0),
                "in_degree": indeg.get(n, 0),
                "out_degree": outdeg.get(n, 0),
                "pagerank": pr.get(n, 0.0),
                "scc_id": node_to_scc.get(n, -1),
                "scc_size": scc_sizes.get(node_to_scc.get(n, -1), 1),
            }
        )

    pd.DataFrame(rows).sort_values(
        by=["level", "pagerank", "course"],
        ascending=[True, False, True],
    ).to_csv(RANKS_CSV, index=False, encoding="utf-8")
    log(f"[rank] wrote {RANKS_CSV}")

    export_topological_order(CG, node_to_scc, level, TOPO_CSV)
    log(f"[topo] wrote {TOPO_CSV}")

    # -------- 6) Graph exports --------
    all_nodes = {n for n in G.nodes() if not is_level7(n)}
    all_nodes |= {x for pair in conflict_pairs for x in pair if not is_level7(x)}

    # Incompat lists as node attributes
    inc_list: dict[str, list[str]] = {n: [] for n in all_nodes}
    for a, b in conflict_pairs:
        if is_level7(a) or is_level7(b):
            continue
        inc_list.setdefault(a, []).append(b)
        inc_list.setdefault(b, []).append(a)

    # Prereqs-only (directed)
    H = nx.DiGraph()
    for n in sorted(all_nodes):
        url, title, *_ = results.get(n, ("", "", "", "", ""))
        H.add_node(
            n,
            label=n,
            title=title,
            url=url,
            level=level.get(n, 0),
            indegree=G.in_degree(n) if n in G else 0,
            outdegree=G.out_degree(n) if n in G else 0,
            pagerank=pr.get(n, 0.0),
            scc_id=node_to_scc.get(n, -1),
            scc_size=scc_sizes.get(node_to_scc.get(n, -1), 1),
            incompat_count=len(inc_list.get(n, [])),
            incompat_with=",".join(sorted(inc_list.get(n, [])))[:1000],
        )

    for p, c in G.edges():
        if not is_level7(p) and not is_level7(c):
            H.add_edge(p, c, relation="prereq")

    nx.write_gexf(H, GEXF_FULL)
    log(f"[graph] wrote {GEXF_FULL} (prereqs only; nodes carry incompat_* attributes)")

    # Incompat-only (undirected)
    I = nx.Graph()
    for n, data in H.nodes(data=True):
        I.add_node(n, **data)

    for a, b in conflict_pairs:
        if a != b and not (is_level7(a) or is_level7(b)):
            I.add_edge(a, b, relation="incompat")

    with contextlib.suppress(Exception):
        cc_idx: dict[str, int] = {}
        for cid, comp in enumerate(nx.connected_components(I)):
            for n in comp:
                cc_idx[n] = cid
        nx.set_node_attributes(I, cc_idx, name="incompat_component")

    nx.write_gexf(I, GEXF_INCOMPAT)
    log(f"[graph] wrote {GEXF_INCOMPAT} (incompatibilities only, undirected)")


async def _as_completed_iter(tasks: list[asyncio.Future]):
    """
    Async iterator over tasks in completion order.
    Lets callers 'await' each finished task inline without collecting
    the entire list of results in memory.
    """
    for fut in asyncio.as_completed(tasks):
        yield fut


# ============================== CLI ================================

def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(
        description=(
            "UQ courses → prereqs+incompat → AST → graph + ranks + topo order."
        )
    )
    ap.add_argument("--years", default="2025", help="Comma-separated years (e.g., 2025 or 2025,2024)")
    ap.add_argument("--prefixes", default="", help="Optional comma-separated subject prefixes (e.g., MATH,STAT,CSSE)")
    ap.add_argument("--workers", type=int, default=64, help="Task concurrency (not requests/sec)")
    ap.add_argument("--level-range", default=None, help="Numeric level filter for seeds, e.g., 3000-5000")
    ap.add_argument("--full-ast", dest="full_ast", action="store_true", help="Save structured AST JSON as well")
    ap.add_argument("--rank", action="store_true", help="(Kept for compatibility; ranks always emitted)")
    ap.add_argument("--rps", type=float, default=1.0, help="Global requests per second (token bucket)")
    ap.add_argument("--burst", type=int, default=4, help="Burst size (token bucket capacity)")
    return ap.parse_args()


if __name__ == "__main__":
    args = parse_args()

    years = [y.strip() for y in args.years.split(",") if y.strip()]
    prefixes = [p.strip() for p in args.prefixes.split(",") if p.strip()] if args.prefixes else None

    level_range = None
    if args.level_range:
        try:
            lo_s, hi_s = args.level_range.split("-", 1)
            level_range = (int(lo_s), int(hi_s))
        except Exception:
            log("Invalid --level-range; expected like 3000-5000")
            level_range = None

    asyncio.run(
        run(
            years=years,
            prefixes=prefixes,
            workers=args.workers,
            level_range=level_range,
            want_ast=args.full_ast,
            want_rank=True,
            rps=args.rps,
            burst=args.burst,
        )
    )
    
    app.run(host='0.0.0.0', port=5001, debug=True)
