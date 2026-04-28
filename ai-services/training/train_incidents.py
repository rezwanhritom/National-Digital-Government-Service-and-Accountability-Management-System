"""
Train TF-IDF + LogisticRegression for incident category & severity,
and RandomForest regressors for impact delay / recovery.
"""
from __future__ import annotations

import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

import sys
from pathlib import Path

_root = Path(__file__).resolve().parents[1]
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import ml_paths  # noqa: E402
from paths import ensure_artifact_dirs  # noqa: E402


def rebalance_incident_df(df: pd.DataFrame, random_state: int = 42) -> pd.DataFrame:
    """
    Rebalance by (category, severity) pair using oversampling.
    This keeps training stable without changing source CSV manually.
    """
    d = df.copy()
    d["pair"] = d["category"].astype(str) + "||" + d["severity"].astype(str)
    counts = d["pair"].value_counts()
    target = int(counts.max()) if not counts.empty else 0
    if target <= 0:
        return df

    chunks: list[pd.DataFrame] = []
    for pair, group in d.groupby("pair", sort=False):
        if len(group) < target:
            extra = group.sample(n=target - len(group), replace=True, random_state=random_state)
            chunks.append(pd.concat([group, extra], ignore_index=True))
        else:
            chunks.append(group.reset_index(drop=True))
    out = pd.concat(chunks, ignore_index=True).sample(frac=1, random_state=random_state).reset_index(drop=True)
    return out.drop(columns=["pair"])


def train_classification() -> None:
    csv_path = ml_paths.INCIDENT_TRAIN_CSV
    df = pd.read_csv(csv_path)
    raw_n = len(df)
    df = rebalance_incident_df(df, random_state=42)
    print(f"Incident dataset rows: raw={raw_n}, balanced={len(df)}")
    df["combined"] = (df["text"].astype(str) + " " + df["location"].astype(str)).str.strip()
    stratify_key = (df["category"].astype(str) + "||" + df["severity"].astype(str)).values

    X_train, X_test, yc_train, yc_test, ys_train, ys_test = train_test_split(
        df["combined"],
        df["category"],
        df["severity"],
        test_size=0.25,
        random_state=42,
        stratify=stratify_key,
    )

    vectorizer = TfidfVectorizer(max_features=800, ngram_range=(1, 2), min_df=1)
    Xtr = vectorizer.fit_transform(X_train)
    Xte = vectorizer.transform(X_test)

    clf_cat = LogisticRegression(max_iter=500, random_state=42, class_weight="balanced")
    clf_cat.fit(Xtr, yc_train)
    cat_pred = clf_cat.predict(Xte)
    cat_acc = accuracy_score(yc_test, cat_pred)
    cat_report = classification_report(yc_test, cat_pred, output_dict=True, zero_division=0)
    print(f"Incident category accuracy (holdout): {cat_acc:.3f}")

    clf_sev = LogisticRegression(max_iter=500, random_state=42, class_weight="balanced")
    clf_sev.fit(Xtr, ys_train)
    sev_pred = clf_sev.predict(Xte)
    sev_acc = accuracy_score(ys_test, sev_pred)
    sev_report = classification_report(ys_test, sev_pred, output_dict=True, zero_division=0)
    print(f"Incident severity accuracy (holdout): {sev_acc:.3f}")

    joblib.dump(vectorizer, ml_paths.INCIDENT_VECTORIZER)
    joblib.dump(clf_cat, ml_paths.INCIDENT_CATEGORY_CLF)
    joblib.dump(clf_sev, ml_paths.INCIDENT_SEVERITY_CLF)

    metrics_path = ml_paths.MODELS_DIR / "incident_classification_metrics.json"
    with metrics_path.open("w", encoding="utf-8") as fp:
        json.dump(
            {
                "dataset_rows_raw": raw_n,
                "dataset_rows_balanced": len(df),
                "category_accuracy": float(cat_acc),
                "severity_accuracy": float(sev_acc),
                "category_report": cat_report,
                "severity_report": sev_report,
            },
            fp,
            indent=2,
        )
    print(f"Saved classification metrics: {metrics_path}")


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
