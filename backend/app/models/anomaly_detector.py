"""Anomaly Detection Inference Service using trained Isolation Forest.

Loads serialized model artifacts, validates feature vector consistency,
evaluates anomaly scores, and provides calibrated interpretations without
conflating statistical outlier status with guaranteed maliciousness.
"""

import json
import os
from typing import Any, Dict, List, Optional, Union
import joblib
import numpy as np
from pydantic import BaseModel, Field

from backend.app.features import (
    FEATURE_DEFINITIONS,
    FEATURE_NAMES,
    FEATURE_SCHEMA_VERSION,
    extract_feature_vector,
)
from backend.app.parser.models import ParsedWorkflow

ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "artifacts")
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "model.joblib")
SCALER_PATH = os.path.join(ARTIFACTS_DIR, "preprocessor.joblib")
METADATA_PATH = os.path.join(ARTIFACTS_DIR, "metadata.json")


class AnomalyDetectionResult(BaseModel):
    """Result schema for ML anomaly prediction."""

    is_anomaly: bool = Field(..., description="True if workflow is classified as a structural anomaly")
    classification: str = Field(..., description="'normal' or 'anomalous'")
    anomaly_score: float = Field(..., description="Calibrated anomaly score between 0.0 (normal) and 1.0 (outlier)")
    raw_score: float = Field(..., description="Raw Isolation Forest path length score (-score_samples)")
    threshold: float = Field(..., description="Decision boundary threshold")
    interpretation: str = Field(..., description="Human-readable explanation of the score")
    top_contributing_features: List[Dict[str, Any]] = Field(
        default_factory=list, description="Top features deviating from the normal baseline distribution"
    )
    model_version: str = Field(..., description="Model version and algorithm identifier")


class AnomalyDetector:
    """Inference engine managing the trained Isolation Forest model artifact."""

    def __init__(self, artifacts_dir: str = ARTIFACTS_DIR):
        self.artifacts_dir = artifacts_dir
        self.model_path = os.path.join(artifacts_dir, "model.joblib")
        self.scaler_path = os.path.join(artifacts_dir, "preprocessor.joblib")
        self.metadata_path = os.path.join(artifacts_dir, "metadata.json")

        self.model: Optional[Any] = None
        self.scaler: Optional[Any] = None
        self.metadata: Dict[str, Any] = {}
        self.feature_names: List[str] = FEATURE_NAMES
        self.threshold: float = 0.5373
        self.is_loaded: bool = False

        self._load_artifacts()

    def _load_artifacts(self):
        """Load serialized model, preprocessor, and metadata from disk."""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(
                f"Trained model artifact not found at {self.model_path}. Run scripts/experiment_ml.py first."
            )
        if not os.path.exists(self.metadata_path):
            raise FileNotFoundError(f"Model metadata not found at {self.metadata_path}.")

        self.model = joblib.load(self.model_path)
        if os.path.exists(self.scaler_path):
            self.scaler = joblib.load(self.scaler_path)

        with open(self.metadata_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

        self.feature_names = self.metadata.get("feature_names", FEATURE_NAMES)
        self.threshold = float(self.metadata.get("score_threshold", 0.5373))
        self.is_loaded = True

    def predict_features(self, features: Union[Dict[str, float], List[float]]) -> AnomalyDetectionResult:
        """Evaluate an extracted feature vector and return calibrated anomaly results."""
        if not self.is_loaded:
            self._load_artifacts()

        # Convert dictionary to ordered vector if necessary
        if isinstance(features, dict):
            vector = [float(features.get(name, FEATURE_DEFINITIONS[name]["default"])) for name in self.feature_names]
        elif isinstance(features, (list, tuple)):
            if len(features) != len(self.feature_names):
                raise ValueError(
                    f"Expected feature vector of length {len(self.feature_names)}, got {len(features)}"
                )
            vector = [float(x) for x in features]
        else:
            raise TypeError(f"Invalid features type: {type(features).__name__}")

        import pandas as pd
        X_df = pd.DataFrame([vector], columns=self.feature_names)

        # Raw score from Isolation Forest: higher means more anomalous
        raw_score = float(-self.model.score_samples(X_df)[0])

        # Calibration: Normalize into a human-friendly [0.0, 1.0] score scale
        # Normal workflows typically score ~0.35 - 0.52. High outliers score > 0.54.
        min_expected = 0.35
        max_expected = 0.65
        calibrated_score = float(np.clip((raw_score - min_expected) / (max_expected - min_expected), 0.0, 1.0))
        calibrated_score = round(calibrated_score, 4)

        is_anomaly = bool(raw_score >= self.threshold)
        classification = "anomalous" if is_anomaly else "normal"

        # Provide descriptive non-dogmatic interpretation
        if calibrated_score >= 0.75:
            interpretation = "Significant structural outlier: Workflow structure deviates heavily from established baseline topology."
        elif calibrated_score >= 0.55 or is_anomaly:
            interpretation = "Moderate structural deviation: Uncharacteristic combination of runner, permissions, or job topologies detected."
        else:
            interpretation = "Conforms to normal baseline patterns: Structural metrics are typical of standard GitHub Actions workflows."

        # Identify top contributing features by comparing with baseline scaler mean/scale
        top_deviations: List[Dict[str, Any]] = []
        if self.scaler is not None and hasattr(self.scaler, "mean_") and hasattr(self.scaler, "scale_"):
            vec_arr = np.array(vector, dtype=float)
            z_scores = np.abs((vec_arr - self.scaler.mean_) / np.maximum(self.scaler.scale_, 1e-6))
            top_indices = np.argsort(z_scores)[::-1][:4]  # Top 4 most atypical features
            for idx in top_indices:
                feat_name = self.feature_names[idx]
                feat_val = vector[idx]
                z_val = float(z_scores[idx])
                if z_val > 0.5:  # Noticeable deviation
                    top_deviations.append({
                        "feature": feat_name,
                        "value": feat_val,
                        "z_score": round(z_val, 2),
                        "description": FEATURE_DEFINITIONS.get(feat_name, {}).get("description", ""),
                    })

        return AnomalyDetectionResult(
            is_anomaly=is_anomaly,
            classification=classification,
            anomaly_score=calibrated_score,
            raw_score=round(raw_score, 4),
            threshold=round(self.threshold, 4),
            interpretation=interpretation,
            top_contributing_features=top_deviations,
            model_version=f"IsolationForest-v{FEATURE_SCHEMA_VERSION}",
        )

    def predict_workflow(self, workflow: ParsedWorkflow) -> AnomalyDetectionResult:
        """Direct entrypoint: Extract features from ParsedWorkflow and predict anomaly status."""
        vector = extract_feature_vector(workflow)
        return self.predict_features(vector)


# Global singleton instance for efficient backend inference
_detector_instance: Optional[AnomalyDetector] = None


def get_anomaly_detector() -> AnomalyDetector:
    """Retrieve or initialize the global AnomalyDetector singleton."""
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = AnomalyDetector()
    return _detector_instance


# Convenient alias
get_detector = get_anomaly_detector

