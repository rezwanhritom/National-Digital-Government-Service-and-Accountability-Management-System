"""
Train TF-IDF + LogisticRegression for incident category & severity,
and RandomForest regressors for impact delay / recovery.
"""
from __future__ import annotations

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

import sys
from pathlib import Path

_root = Path(__file__).resolve().parents[1]
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import ml_paths  # noqa: E402
from paths import ensure_artifact_dirs  # noqa: E402


def train_classification() -> None:
    csv_path = ml_paths.INCIDENT_TRAIN_CSV
    df = pd.read_csv(csv_path)
    df["combined"] = (df["text"].astype(str) + " " + df["location"].astype(str)).str.strip()

    X_train, X_test, yc_train, yc_test, ys_train, ys_test = train_test_split(
        df["combined"],
        df["category"],
        df["severity"],
        test_size=0.25,
        random_state=42,
    )

    vectorizer = TfidfVectorizer(max_features=800, ngram_range=(1, 2), min_df=1)
    Xtr = vectorizer.fit_transform(X_train)
    Xte = vectorizer.transform(X_test)

    clf_cat = LogisticRegression(max_iter=500, random_state=42)
    clf_cat.fit(Xtr, yc_train)
    cat_acc = accuracy_score(yc_test, clf_cat.predict(Xte))
    print(f"Incident category accuracy (holdout): {cat_acc:.3f}")

    clf_sev = LogisticRegression(max_iter=500, random_state=42)
    clf_sev.fit(Xtr, ys_train)
    sev_acc = accuracy_score(ys_test, clf_sev.predict(Xte))
    print(f"Incident severity accuracy (holdout): {sev_acc:.3f}")

    joblib.dump(vectorizer, ml_paths.INCIDENT_VECTORIZER)
    joblib.dump(clf_cat, ml_paths.INCIDENT_CATEGORY_CLF)
    joblib.dump(clf_sev, ml_paths.INCIDENT_SEVERITY_CLF)


def train_impact() -> None:
    df = pd.read_csv(ml_paths.IMPACT_TRAIN_CSV)
    cat_enc = LabelEncoder()
    sev_enc = LabelEncoder()
    df["cat_i"] = cat_enc.fit_transform(df["category"].astype(str))
    df["sev_i"] = sev_enc.fit_transform(df["severity"].astype(str))

    X = df[["cat_i", "sev_i", "affected_route_count", "hour"]].astype(np.float64).values
    y_delay = df["delay_minutes"].astype(float).values
    y_rec = df["recovery_minutes"].astype(float).values

    m_delay = RandomForestRegressor(n_estimators=80, random_state=42, n_jobs=-1)
    m_rec = RandomForestRegressor(n_estimators=80, random_state=42, n_jobs=-1)
    m_delay.fit(X, y_delay)
    m_rec.fit(X, y_rec)

    joblib.dump(cat_enc, ml_paths.IMPACT_CATEGORY_ENCODER)
    joblib.dump(sev_enc, ml_paths.IMPACT_SEVERITY_ENCODER)
    joblib.dump(m_delay, ml_paths.IMPACT_DELAY_MODEL)
    joblib.dump(m_rec, ml_paths.IMPACT_RECOVERY_MODEL)
    print("Saved impact delay/recovery models.")


def main() -> None:
    ensure_artifact_dirs()
    if not ml_paths.INCIDENT_TRAIN_CSV.exists():
        raise SystemExit(f"Missing {ml_paths.INCIDENT_TRAIN_CSV}")
    train_classification()
    if not ml_paths.IMPACT_TRAIN_CSV.exists():
        raise SystemExit(f"Missing {ml_paths.IMPACT_TRAIN_CSV}")
    train_impact()


if __name__ == "__main__":
    main()
