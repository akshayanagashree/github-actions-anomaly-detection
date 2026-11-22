"""Automated tests for Phase 2 Dataset Quality and Integrity.

Validates that:
1. Manifest file exists and conforms strictly to the schema.
2. Every YAML workflow exists on disk and safely parses without execution.
3. Every anomalous workflow correctly pairs with its parent baseline.
4. Paired group splitting prevents data leakage across train and test sets.
"""

import csv
import os
import pytest
import yaml
from sklearn.model_selection import GroupShuffleSplit

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATASET_DIR = os.path.join(ROOT_DIR, "dataset")
MANIFEST_PATH = os.path.join(DATASET_DIR, "manifest.csv")


@pytest.fixture
def manifest_records():
    """Load and parse manifest.csv records."""
    assert os.path.exists(MANIFEST_PATH), f"manifest.csv missing at {MANIFEST_PATH}"
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        records = list(reader)
    assert len(records) > 0, "manifest.csv is empty"
    return records


def test_manifest_schema_and_columns(manifest_records):
    """Verify all expected columns exist and have non-empty required fields."""
    required_cols = [
        "id", "pair_id", "filename", "label", "anomaly_category",
        "modification_description", "rationale", "parent_workflow",
        "source_repo", "source_ref", "license", "source_url",
        "collection_date", "original_filename"
    ]
    for row in manifest_records:
        for col in required_cols:
            assert col in row, f"Column {col} missing in manifest row {row}"
            assert row[col] is not None and len(row[col].strip()) > 0, f"Empty field {col} in row {row['id']}"


def test_workflow_files_exist_and_parse_safely(manifest_records):
    """Verify each workflow file exists on disk and is safe, valid YAML."""
    for row in manifest_records:
        filepath = os.path.join(DATASET_DIR, row["filename"])
        assert os.path.exists(filepath), f"Workflow file not found: {filepath}"
        
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            assert len(content.strip()) > 0, f"File {row['filename']} is empty"
            parsed = yaml.safe_load(content)
            assert isinstance(parsed, dict), f"File {row['filename']} did not parse into a dictionary"
            # Ensure it contains standard GitHub Actions keys (jobs, name, or on/True)
            has_expected_keys = any(k in parsed for k in ["jobs", "name", "on", True])
            assert has_expected_keys, f"Workflow {row['filename']} missing core top-level keys"


def test_pairing_integrity(manifest_records):
    """Verify pair relationships: each pair has 1 normal workflow and >=1 anomalous variants."""
    pairs = {}
    for row in manifest_records:
        pairs.setdefault(row["pair_id"], []).append(row)

    for pair_id, members in pairs.items():
        normals = [m for m in members if m["label"] == "normal"]
        anomalies = [m for m in members if m["label"] == "anomalous"]

        assert len(normals) == 1, f"Pair {pair_id} must have exactly one normal workflow, found {len(normals)}"
        assert len(anomalies) >= 1, f"Pair {pair_id} must have at least one anomaly"

        normal_id = normals[0]["id"]
        for a in anomalies:
            assert a["parent_workflow"] == normal_id, (
                f"Anomaly {a['id']} points to parent {a['parent_workflow']}, expected {normal_id}"
            )
            assert a["anomaly_category"] != "none", f"Anomaly {a['id']} has category 'none'"


def test_anti_leakage_group_split_invariance(manifest_records):
    """Demonstrate that GroupShuffleSplit cleanly separates pairs without cross-split leakage."""
    pair_ids = [r["pair_id"] for r in manifest_records]
    indices = list(range(len(manifest_records)))

    gss = GroupShuffleSplit(n_splits=1, test_size=0.3, random_state=42)
    train_idx, test_idx = next(gss.split(indices, groups=pair_ids))

    train_pairs = set(pair_ids[i] for i in train_idx)
    test_pairs = set(pair_ids[i] for i in test_idx)

    # Invariant: Intersection between train pairs and test pairs must be empty
    leakage = train_pairs.intersection(test_pairs)
    assert len(leakage) == 0, f"Data leakage detected! Shared pairs: {leakage}"
    assert len(train_pairs) > 0 and len(test_pairs) > 0
