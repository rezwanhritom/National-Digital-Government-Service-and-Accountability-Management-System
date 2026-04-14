"""
Train ETA regressor (travel_time) from eta_dataset.csv.
Persists model + encoders for FastAPI inference.
"""
from __future__ import annotations

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from paths import (
    ETA_CSV,
    ETA_MODEL,
    ROUTE_ENCODER,
    STOP_ENCODER,
    TRAFFIC_ENCODER,
    ensure_artifact_dirs,
)


def main() -> None:
    ensure_artifact_dirs()
    df = pd.read_csv(ETA_CSV)

    feature_cols = ["route", "from_stop", "to_stop", "hour", "traffic_level"]
    X_df = df[feature_cols].copy()
    y = df["travel_time"].astype(int).values

    route_encoder = LabelEncoder()
    route_encoder.fit(X_df["route"])

    stop_encoder = LabelEncoder()
    all_stops = np.unique(
        np.concatenate([X_df["from_stop"].values, X_df["to_stop"].values])
    )
    stop_encoder.fit(all_stops)

    traffic_encoder = LabelEncoder()
    traffic_encoder.fit(X_df["traffic_level"])

    X = np.column_stack(
        [
            route_encoder.transform(X_df["route"]),
            stop_encoder.transform(X_df["from_stop"]),
            stop_encoder.transform(X_df["to_stop"]),
            X_df["hour"].astype(int).values.reshape(-1, 1),
            traffic_encoder.transform(X_df["traffic_level"]),
        ]
    ).astype(np.float64)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=100,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    score = r2_score(y_test, y_pred)
    print(f"ETA model R^2 (test): {score:.4f}")

    joblib.dump(route_encoder, ROUTE_ENCODER)
    joblib.dump(stop_encoder, STOP_ENCODER)
    joblib.dump(traffic_encoder, TRAFFIC_ENCODER)
    joblib.dump(model, ETA_MODEL)

    print(f"Saved encoders to {ROUTE_ENCODER.parent}")
    print(f"Saved model to {ETA_MODEL}")


if __name__ == "__main__":
    main()
