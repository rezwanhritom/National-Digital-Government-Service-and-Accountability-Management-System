"""
Build synthetic congestion training data from routes.json segments, train classifier.
"""
from __future__ import annotations

import json
import random
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

_root = Path(__file__).resolve().parents[1]
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import ml_paths  # noqa: E402
from paths import ensure_artifact_dirs  # noqa: E402


def build_segments() -> list[str]:
    routes_path = _root / "data" / "routes.json"
    raw = json.loads(routes_path.read_text(encoding="utf-8"))
    keys = []
    for r in raw:
        name = r.get("name", "")
        stops = r.get("stops") or []
        for i in range(len(stops) - 1):
            a = str(stops[i]).strip()
            b = str(stops[i + 1]).strip()
            keys.append(f"{name}|{a}->{b}")
    return keys


def label_for(hour: int, dow: int, rng: random.Random) -> str:
    """Peak hours -> more HIGH congestion."""
    base = 0.0
    if 7 <= hour <= 10 or 17 <= hour <= 20:
        base = 0.55
    elif 11 <= hour <= 16:
        base = 0.35
    else:
        base = 0.12
    if dow >= 5:
        base *= 0.85
    base += rng.random() * 0.35
    if base > 0.62:
        return "HIGH"
    if base > 0.38:
        return "MEDIUM"
    return "LOW"


def main() -> None:
    ensure_artifact_dirs()
    rng = random.Random(42)
    segments = build_segments()
    rows = []
    for _ in range(900):
        seg = rng.choice(segments)
        hour = rng.randint(0, 23)
        dow = rng.randint(0, 6)
        rows.append(
            {
                "segment_key": seg,
                "hour": hour,
                "dow": dow,
                "level": label_for(hour, dow, rng),
            }
        )
    df = pd.DataFrame(rows)
    out_csv = ml_paths.CONGESTION_TRAIN_CSV
    df.to_csv(out_csv, index=False)
    print(f"Wrote {out_csv} ({len(df)} rows)")

    enc = LabelEncoder()
    enc.fit(df["segment_key"])
    Xi = enc.transform(df["segment_key"])
    X = np.column_stack([Xi, df["hour"].values, df["dow"].values]).astype(np.float64)
    y = df["level"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    clf = RandomForestClassifier(n_estimators=120, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)
    acc = accuracy_score(y_test, clf.predict(X_test))
    print(f"Congestion classifier holdout accuracy: {acc:.3f}")

    joblib.dump(enc, ml_paths.CONGESTION_SEGMENT_ENCODER)
    joblib.dump(clf, ml_paths.CONGESTION_MODEL)
    print(f"Saved {ml_paths.CONGESTION_MODEL}")


if __name__ == "__main__":
    main()
