# Training pipelines

- **notebooks/** – Jupyter notebooks for ETA, crowding, congestion, incident classification (exploration, feature engineering, training).
- **scripts/** – Data extraction, feature engineering, and training scripts (run in batch or CI).

Train models, evaluate (MAE/accuracy etc.), then persist (e.g. `.pkl`) to `model_registry/` or configured object storage. The AI service loads from there at runtime.
