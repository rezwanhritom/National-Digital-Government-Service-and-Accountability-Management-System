"""
One-off / repeatable: add training rows for bidirectional routes named "{name} (Return)".

- ETA: for each row whose (route, from_stop, to_stop) is a forward consecutive pair,
  append a row for the return route with (to_stop, from_stop) and same features.
- Crowd: duplicate each row with route "{route} (Return)" (same stop, hour, level).

Run from repo root or ai-services:
  python ai-services/training/augment_return_training_data.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

_root = Path(__file__).resolve().parents[1]
DATA = _root / "data"
ROUTES = DATA / "routes.json"
ETA_CSV = DATA / "eta_dataset.csv"
CROWD_CSV = DATA / "crowd_dataset.csv"


def _forward_edges() -> dict[str, set[tuple[str, str]]]:
    raw = json.loads(ROUTES.read_text(encoding="utf-8"))
    out: dict[str, set[tuple[str, str]]] = {}
    for r in raw:
        name = str(r.get("name", "")).strip()
        if name.endswith(" (Return)"):
            continue
        stops = r.get("stops") or []
        pairs: set[tuple[str, str]] = set()
        for i in range(len(stops) - 1):
            a = str(stops[i]).strip()
            b = str(stops[i + 1]).strip()
            pairs.add((a, b))
        out[name] = pairs
    return out


def augment_eta(df: pd.DataFrame, edges: dict[str, set[tuple[str, str]]]) -> pd.DataFrame:
    extra_rows = []
    for _, row in df.iterrows():
        r = str(row["route"]).strip()
        if r.endswith(" (Return)"):
            continue
        a = str(row["from_stop"]).strip()
        b = str(row["to_stop"]).strip()
        if r in edges and (a, b) in edges[r]:
            extra_rows.append(
                {
                    "route": f"{r} (Return)",
                    "from_stop": b,
                    "to_stop": a,
                    "hour": row["hour"],
                    "traffic_level": row["traffic_level"],
                    "travel_time": row["travel_time"],
                }
            )
    if not extra_rows:
        return df
    return pd.concat([df, pd.DataFrame(extra_rows)], ignore_index=True)


def augment_crowd(df: pd.DataFrame) -> pd.DataFrame:
    extra = []
    for _, row in df.iterrows():
        r = str(row["route"]).strip()
        if r.endswith(" (Return)"):
            continue
        extra.append(
            {
                "route": f"{r} (Return)",
                "stop": row["stop"],
                "hour": row["hour"],
                "crowd_level": row["crowd_level"],
            }
        )
    if not extra:
        return df
    return pd.concat([df, pd.DataFrame(extra)], ignore_index=True)


def _strip_return_rows(df: pd.DataFrame, route_col: str = "route") -> pd.DataFrame:
    """Remove rows for synthetic return routes so re-runs stay idempotent."""
    r = df[route_col].astype(str).str.strip()
    return df[~r.str.endswith(" (Return)")].copy()


def main() -> None:
    if not ROUTES.exists():
        print("Missing routes.json", file=sys.stderr)
        sys.exit(1)
    edges = _forward_edges()
    eta = _strip_return_rows(pd.read_csv(ETA_CSV))
    n_eta_before = len(eta)
    eta2 = augment_eta(eta, edges)
    eta2.to_csv(ETA_CSV, index=False)
    print(f"ETA rows: {n_eta_before} -> {len(eta2)} (+{len(eta2) - n_eta_before})")

    crowd = _strip_return_rows(pd.read_csv(CROWD_CSV))
    n_c_before = len(crowd)
    crowd2 = augment_crowd(crowd)
    crowd2.to_csv(CROWD_CSV, index=False)
    print(f"Crowd rows: {n_c_before} -> {len(crowd2)} (+{len(crowd2) - n_c_before})")


if __name__ == "__main__":
    main()
