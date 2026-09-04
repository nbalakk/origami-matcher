# -*- coding: utf-8 -*-
"""
Пересобирает справочник кампаний из свежих выгрузок Оригами.

    python tools/bank.py <goal_values.csv> <weekly_budgets.csv>

Берёт обе выгрузки (ставки дают цели, бюджеты — кампании без целевых строк),
складывает объединение и переписывает src/core/campaigns.js. Ничего не
выдумывает: всё, что попадает в справочник, прочитано из выгрузки.
"""
import csv
import io
import os
import re
import sys
from datetime import date

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "core", "campaigns.js")

digits = lambda s: "".join(re.findall(r"\d+", s or ""))


def rows(path):
    text = io.open(path, encoding="utf-8-sig", newline="").read()
    lines = [l for l in text.split("\r\n") if l.strip()]
    head = next(csv.reader([lines[0]], delimiter=";"))
    return head, [next(csv.reader([l], delimiter=";")) for l in lines[1:]]


def norm_place(p):
    p = (p or "").strip().lower()
    return 1 if p.startswith("сет") else 0          # 0 — поиск, 1 — сети


def collect(paths):
    camps = {}
    for path in paths:
        head, data = rows(path)
        goal_col = head.index("GoalID") if "GoalID" in head else -1
        for f in data:
            cid = digits(f[2])
            if not cid:
                continue
            c = camps.setdefault(cid, {"acc": digits(f[0]), "login": f[1].strip(),
                                       "name": f[3], "place": norm_place(f[4]),
                                       "strat": f[5], "goals": set()})
            if goal_col >= 0:
                g = digits(f[goal_col])
                if g:
                    c["goals"].add(g)
    return camps


def js_string(s):
    return '"' + str(s).replace("\\", "\\\\").replace('"', '\\"') + '"'


def main(argv):
    if len(argv) < 2:
        raise SystemExit(__doc__)
    camps = collect(argv)
    accounts = sorted({c["acc"] for c in camps.values()})
    logins = {}
    for c in camps.values():
        logins[c["acc"]] = c["login"]
    strats = sorted({c["strat"] for c in camps.values()})
    goals = sorted({g for c in camps.values() for g in c["goals"]})
    gi = {g: i for i, g in enumerate(goals)}

    packed = []
    for cid in sorted(camps, key=lambda x: int(x)):
        c = camps[cid]
        gs = ".".join(str(gi[g]) for g in sorted(c["goals"], key=lambda g: gi[g]))
        packed.append("    %s:%s," % (js_string(cid),
                      js_string("%d,%d,%d,%s|%s" % (accounts.index(c["acc"]), c["place"],
                                                    strats.index(c["strat"]), gs, c["name"]))))

    body = io.open(os.path.join(ROOT, "tools", "campaigns.tmpl.js"), encoding="utf-8").read()
    body = (body
            .replace("__UPDATED__", date.today().isoformat())
            .replace("__ACCOUNTS__", ",\n    ".join(
                "%s:%s" % (js_string(a), js_string(logins[a])) for a in accounts))
            .replace("__STRATS__", ",\n    ".join(js_string(s) for s in strats))
            .replace("__GOALS__", ",\n    ".join(js_string(g) for g in goals))
            .replace("__CAMPAIGNS__", "\n".join(packed).rstrip(",")))
    io.open(OUT, "w", encoding="utf-8", newline="").write(body)
    print("справочник кампаний пересобран: %d кампаний, %d аккаунтов, %d стратегий, %d целей"
          % (len(camps), len(accounts), len(strats), len(goals)))
    print("размер:", os.path.getsize(OUT) // 1024, "КБ ·", OUT)


if __name__ == "__main__":
    main(sys.argv[1:])
