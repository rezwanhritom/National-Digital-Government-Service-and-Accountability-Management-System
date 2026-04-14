"""
Train crowding classifier (crowd_level) from crowd_dataset.csv.
Reuses route_encoder.pkl and stop_encoder.pkl from train_eta.py when present
so labels stay aligned for FastAPI inference.
"""
from __future__ import annotations

import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from paths import (
    CROWD_CSV,
    CROWD_ENCODER,
    CROWD_MODEL,
    ROUTE_ENCODER,
    STOP_ENCODER,
    ensure_artifact_dirs,
)


def _load_or_fit_route_encoder(series: pd.Series) -> LabelEncoder:
    if ROUTE_ENCODER.exists():
        enc: LabelEncoder = joblib.load(ROUTE_ENCODER)
        unseen = set(series.unique()) - set(enc.classes_)
        if unseen:
            raise ValueError(
                f"Routes in crowd data not in saved route_encoder: {unseen}"
            )
        return enc
    enc = LabelEncoder()
    enc.fit(series)
    joblib.dump(enc, ROUTE_ENCODER)
    print("Warning: route_encoder.pkl was missing; fitted from crowd data.", file=sys.stderr)
    return enc


def _load_or_fit_stop_encoder(series: pd.Series) -> LabelEncoder:
    if STOP_ENCODER.exists():
        enc: LabelEncoder = joblib.load(STOP_ENCODER)
        unseen = set(series.unique()) - set(enc.classes_)
        if unseen:
            raise ValueError(
                f"Stops in crowd data not in saved stop_encoder: {unseen}"
            )
        return enc
    enc = LabelEncoder()
    enc.fit(series)
    joblib.dump(enc, STOP_ENCODER)
    print("Warning: stop_encoder.pkl was missing; fitted from crowd data.", file=sys.stderr)
    return enc


def main() -> None:
    ensure_artifact_dirs()
    df = pd.read_csv(CROWD_CSV)

    X_df = df[["route", "stop", "hour"]].copy()
    y_raw = df["crowd_level"]

    route_encoder = _load_or_fit_route_encoder(X_df["route"])
    stop_encoder = _load_or_fit_stop_encoder(X_df["stop"])

    crowd_encoder = LabelEncoder()
    crowd_encoder.fit(y_raw)

    X = np.column_stack(
        [
            route_encoder.transform(X_df["route"]),
            stop_encoder.transform(X_df["stop"]),
            X_df["hour"].astype(int).values.reshape(-1, 1),
        ]
    ).astype(np.float64)
    y = crowd_encoder.transform(y_raw)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Crowd model accuracy (test): {acc:.4f}")

    joblib.dump(crowd_encoder, CROWD_ENCODER)
    joblib.dump(model, CROWD_MODEL)

    print(f"Saved crowd_encoder to {CROWD_ENCODER}")
    print(f"Saved model to {CROWD_MODEL}")


if __name__ == "__main__":
    main()
