"""Automated unit tests for Machine Learning Model Artifacts and Inference Service.

Tests cover:
1. Serialization artifact existence and metadata integrity.
2. AnomalyDetector loading and threshold initialization.
3. Prediction reproducibility with ordered vectors and dictionary inputs.
4. Input validation (wrong vector size, invalid types).
5. Calibrated anomaly score range and top contributing feature explanations.
6. End-to-end prediction directly from ParsedWorkflow instances.
"""

import json
import os
import joblib
import numpy as np
import pytest

from backend.app.features import FEATURE_NAMES, FEATURE_SCHEMA_VERSION
from backend.app.models import (
    AnomalyDetectionResult,
    AnomalyDetector,
    get_anomaly_detector,
)
from backend.app.parser import parse_workflow

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARTIFACTS_DIR = os.path.join(ROOT_DIR, "backend", "app", "models", "artifacts")
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "model.joblib")
SCALER_PATH = os.path.join(ARTIFACTS_DIR, "preprocessor.joblib")
METADATA_PATH = os.path.join(ARTIFACTS_DIR, "metadata.json")
DATASET_DIR = os.path.join(ROOT_DIR, "dataset")


def test_model_artifacts_exist_and_loadable():
    """Verify serialized model artifacts exist and can be loaded with joblib."""
    assert os.path.exists(MODEL_PATH), f"Missing model artifact: {MODEL_PATH}"
    assert os.path.exists(SCALER_PATH), f"Missing scaler artifact: {SCALER_PATH}"
    assert os.path.exists(METADATA_PATH), f"Missing metadata: {METADATA_PATH}"

    model = joblib.load(MODEL_PATH)
    assert hasattr(model, "score_samples"), "Model lacks score_samples method"
    assert hasattr(model, "predict"), "Model lacks predict method"

    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["schema_version"] == FEATURE_SCHEMA_VERSION
    assert meta["model_type"] == "IsolationForest"
    assert len(meta["feature_names"]) == len(FEATURE_NAMES)
    assert meta["score_threshold"] > 0


def test_detector_initialization():
    """Verify AnomalyDetector initializes and loads artifacts cleanly."""
    detector = AnomalyDetector(artifacts_dir=ARTIFACTS_DIR)
    assert detector.is_loaded is True
    assert detector.model is not None
    assert detector.threshold > 0
    assert len(detector.feature_names) == len(FEATURE_NAMES)


def test_prediction_with_vector_and_dict():
    """Verify inference works identically with float vectors and feature dictionaries."""
    detector = get_anomaly_detector()

    # Create synthetic standard feature vector
    normal_vector = [0.0] * len(FEATURE_NAMES)
    normal_vector[0] = 2.0  # job_count
    normal_vector[1] = 6.0  # step_count
    normal_vector[2] = 3.0  # avg_steps_per_job
    normal_vector[15] = 1.0 # github_hosted_ratio

    res_vector = detector.predict_features(normal_vector)
    assert isinstance(res_vector, AnomalyDetectionResult)
    assert 0.0 <= res_vector.anomaly_score <= 1.0
    assert res_vector.classification in ("normal", "anomalous")
    assert res_vector.model_version.startswith("IsolationForest")

    # Pass as dictionary
    feature_dict = {name: normal_vector[idx] for idx, name in enumerate(FEATURE_NAMES)}
    res_dict = detector.predict_features(feature_dict)
    assert isinstance(res_dict, AnomalyDetectionResult)
    assert res_dict.raw_score == res_vector.raw_score
    assert res_dict.classification == res_vector.classification


def test_prediction_from_parsed_workflow():
    """Verify end-to-end prediction directly from a ParsedWorkflow instance."""
    detector = get_anomaly_detector()
    workflow_yaml = """
    name: Simple Test CI
    on: push
    jobs:
      test:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - run: echo test
    """
    parsed = parse_workflow(workflow_yaml)
    result = detector.predict_workflow(parsed)

    assert isinstance(result, AnomalyDetectionResult)
    assert 0.0 <= result.anomaly_score <= 1.0
    assert len(result.interpretation) > 0


def test_invalid_input_validation():
    """Verify invalid feature vectors raise appropriate exceptions."""
    detector = get_anomaly_detector()

    # Wrong vector length
    with pytest.raises(ValueError, match="Expected feature vector of length"):
        detector.predict_features([1.0, 2.0, 3.0])

    # Invalid type
    with pytest.raises(TypeError, match="Invalid features type"):
        detector.predict_features("not a vector")


def test_singleton_consistency():
    """Verify get_anomaly_detector returns the same persistent singleton instance."""
    d1 = get_anomaly_detector()
    d2 = get_anomaly_detector()
    assert d1 is d2
