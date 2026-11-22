"""Dataset Validation and Integrity Verifier.

Checks:
1. Manifest file existence and schema completeness.
2. Existence of all normal and anomalous workflow files referenced in the manifest.
3. Safe YAML syntax parsing (yaml.safe_load) for every file.
4. Correctness of pairing relationships (each anomalous workflow points to a valid parent).
5. Category distribution and label counts.
"""

import csv
import os
import sys
import yaml

DATASET_DIR = os.path.dirname(os.path.abspath(__file__))
MANIFEST_PATH = os.path.join(DATASET_DIR, "manifest.csv")

REQUIRED_COLUMNS = [
    "id", "pair_id", "filename", "label", "anomaly_category",
    "modification_description", "rationale", "parent_workflow",
    "source_repo", "source_ref", "license", "source_url",
    "collection_date", "original_filename"
]


def validate_dataset():
    print(f"Validating dataset in: {DATASET_DIR}")
    
    # 1. Manifest file check
    if not os.path.exists(MANIFEST_PATH):
        print(f"FAIL: manifest.csv not found at {MANIFEST_PATH}")
        sys.exit(1)
    
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        missing_cols = [c for c in REQUIRED_COLUMNS if c not in headers]
        if missing_cols:
            print(f"FAIL: Missing required columns in manifest: {missing_cols}")
            sys.exit(1)
        
        rows = list(reader)

    print(f"Total manifest records: {len(rows)}")

    # 2. Row checks
    id_map = {}
    pair_map = {}
    normal_ids = set()
    category_counts = {}
    label_counts = {"normal": 0, "anomalous": 0}

    for idx, r in enumerate(rows, 1):
        wf_id = r["id"]
        pair_id = r["pair_id"]
        filename = r["filename"]
        label = r["label"]
        category = r["anomaly_category"]
        parent_id = r["parent_workflow"]

        # Duplicate ID check
        if wf_id in id_map:
            print(f"FAIL: Duplicate workflow ID found: {wf_id}")
            sys.exit(1)
        id_map[wf_id] = r

        # Label check
        if label not in label_counts:
            print(f"FAIL: Invalid label '{label}' in row {idx} ({wf_id})")
            sys.exit(1)
        label_counts[label] += 1
        category_counts[category] = category_counts.get(category, 0) + 1

        if label == "normal":
            normal_ids.add(wf_id)
            if parent_id != wf_id:
                print(f"FAIL: Normal workflow {wf_id} parent must be itself, got {parent_id}")
                sys.exit(1)

        # File existence check
        full_path = os.path.join(DATASET_DIR, filename)
        if not os.path.exists(full_path):
            print(f"FAIL: Workflow file does not exist: {full_path}")
            sys.exit(1)

        # Safe YAML parsing check
        try:
            with open(full_path, "r", encoding="utf-8") as yf:
                parsed = yaml.safe_load(yf)
                if not isinstance(parsed, dict):
                    print(f"FAIL: {filename} parsed as non-dict ({type(parsed)})")
                    sys.exit(1)
        except Exception as e:
            print(f"FAIL: Safe YAML parsing error in {filename}: {e}")
            sys.exit(1)

        pair_map.setdefault(pair_id, []).append(r)

    # 3. Pair verification
    print(f"\nVerifying {len(pair_map)} workflow pairs:")
    for pair_id, members in pair_map.items():
        normals = [m for m in members if m["label"] == "normal"]
        anomalies = [m for m in members if m["label"] == "anomalous"]
        if len(normals) != 1:
            print(f"FAIL: Pair {pair_id} must have exactly 1 normal workflow, found {len(normals)}")
            sys.exit(1)
        if len(anomalies) < 1:
            print(f"FAIL: Pair {pair_id} has no anomalous variants")
            sys.exit(1)
        for a in anomalies:
            if a["parent_workflow"] != normals[0]["id"]:
                print(f"FAIL: Anomaly {a['id']} parent ({a['parent_workflow']}) does not match normal {normals[0]['id']}")
                sys.exit(1)
        print(f"  [OK] {pair_id}: {normals[0]['id']} ({normals[0]['source_repo']}) -> {len(anomalies)} anomalies")

    # 4. Summary Report
    print("\n--- Summary Report ---")
    print(f"Total Workflows: {len(rows)}")
    print(f"Normal Baselines: {label_counts['normal']}")
    print(f"Anomalous Variants: {label_counts['anomalous']}")
    print("\nCategory Distribution:")
    for cat, count in sorted(category_counts.items()):
        print(f"  - {cat}: {count}")

    print("\nAll validation checks PASSED successfully!")


if __name__ == "__main__":
    validate_dataset()
