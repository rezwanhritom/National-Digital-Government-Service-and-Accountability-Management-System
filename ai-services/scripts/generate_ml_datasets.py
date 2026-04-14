"""
Regenerate ai-services/data/eta_dataset.csv and crowd_dataset.csv from
routes.json and stops.json. Deterministic (no RNG).
"""
from __future__ import annotations

import csv
import hashlib
import json
import sys
from pathlib import Path


def _u32(key: str) -> int:
    return int(hashlib.blake2b(key.encode(), digest_size=4).hexdigest(), 16)


def traffic_level_for_hour(hour: int) -> str:
    if 7 <= hour <= 10 or 17 <= hour <= 20:
        return "HIGH"
    if 11 <= hour <= 16:
        return "MEDIUM"
    return "LOW"


def base_minutes(route: str, frm: str, to: str) -> int:
    v = _u32(f"base|{route}|{frm}|{to}")
    return 5 + (v % 4)


def eta_travel_time(
    route: str, frm: str, to: str, hour: int, traffic: str, variant: int
) -> int:
    base = base_minutes(route, frm, to)
    v = _u32(f"eta|{route}|{frm}|{to}|{hour}|{variant}")
    if traffic == "HIGH":
        mult = 1.5 + (v % 51) / 100.0
        t = base * mult
    elif traffic == "MEDIUM":
        t = base * 1.2
    else:
        t = float(base)
    delta = -2 + (v % 5)
    minutes = int(round(t + delta))
    return max(4, min(minutes, 25))


def crowd_level(
    route: str,
    stop: str,
    hour: int,
    variant: int,
    busy_stops: set[str],
) -> str:
    base = traffic_level_for_hour(hour)
    v = _u32(f"crowd|{route}|{stop}|{hour}|{variant}")
    if stop in busy_stops:
        if base == "LOW" and (v % 100) < 35:
            return "MEDIUM"
        if base == "MEDIUM" and (v % 100) < 40:
            return "HIGH"
        return base
    if base == "LOW" and (v % 100) < 6:
        return "MEDIUM"
    return base


def main() -> None:
    ai_services = Path(__file__).resolve().parents[1]
    data_dir = ai_services / "data"
    routes_path = data_dir / "routes.json"
    stops_path = data_dir / "stops.json"

    routes = json.loads(routes_path.read_text(encoding="utf-8"))
    stops = json.loads(stops_path.read_text(encoding="utf-8"))
    busy_stops = {s["name"] for s in stops if s.get("zone") == "busy"}

    n_variants = 5
    hours = list(range(6, 24))

    eta_rows: list[dict[str, str | int]] = []
    for r in routes:
        name = r["name"]
        seq: list[str] = r["stops"]
        for i in range(len(seq) - 1):
            frm, to = seq[i], seq[i + 1]
            for hour in hours:
                tl = traffic_level_for_hour(hour)
                for variant in range(n_variants):
                    tt = eta_travel_time(name, frm, to, hour, tl, variant)
                    eta_rows.append(
                        {
                            "route": name,
                            "from_stop": frm,
                            "to_stop": to,
                            "hour": hour,
                            "traffic_level": tl,
                            "travel_time": tt,
                        }
                    )

    crowd_rows: list[dict[str, str | int]] = []
    for r in routes:
        name = r["name"]
        for stop in r["stops"]:
            for hour in hours:
                for variant in range(n_variants):
                    cl = crowd_level(name, stop, hour, variant, busy_stops)
                    crowd_rows.append(
                        {
                            "route": name,
                            "stop": stop,
                            "hour": hour,
                            "crowd_level": cl,
                        }
                    )

    eta_path = data_dir / "eta_dataset.csv"
    with eta_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "route",
                "from_stop",
                "to_stop",
                "hour",
                "traffic_level",
                "travel_time",
            ],
        )
        w.writeheader()
        w.writerows(eta_rows)

    crowd_path = data_dir / "crowd_dataset.csv"
    with crowd_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=["route", "stop", "hour", "crowd_level"],
        )
        w.writeheader()
        w.writerows(crowd_rows)

    print(f"Wrote {len(eta_rows)} rows -> {eta_path}", file=sys.stderr)
    print(f"Wrote {len(crowd_rows)} rows -> {crowd_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
