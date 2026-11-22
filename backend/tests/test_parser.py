"""Comprehensive unit tests for the safe GitHub Actions YAML parser.

Tests cover:
1. Safe loading and rejection of unsafe deserialization tags.
2. Malformed, empty, whitespace-only, and comment-only YAML.
3. Unexpected root types (lists, integers, strings).
4. Payload size limits.
5. Normalization of YAML 1.1 'on:' boolean keys.
6. Extraction of jobs, steps, runners, dependencies, environments, and permissions.
7. Action reference parsing, categorization, and SHA commit pinning.
8. Secret reference detection across env, with, run, and if statements.
9. Verification against authentic and anomalous dataset samples without executing code.
"""

import os
import pytest
import yaml

from backend.app.parser import (
    ActionReference,
    ParsedWorkflow,
    WorkflowParsingError,
    extract_secrets_from_value,
    parse_action_reference,
    parse_workflow,
    safe_load_yaml,
)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATASET_DIR = os.path.join(ROOT_DIR, "dataset")


# --- 1. Empty & Malformed Input Tests ---

def test_empty_and_whitespace_yaml():
    """Verify empty or whitespace-only workflows raise WorkflowParsingError."""
    with pytest.raises(WorkflowParsingError, match="Workflow content is empty"):
        parse_workflow("")

    with pytest.raises(WorkflowParsingError, match="Workflow content is empty"):
        parse_workflow("   \n\t  \n  ")

    with pytest.raises(WorkflowParsingError, match="Workflow content cannot be None"):
        parse_workflow(None)


def test_comment_only_yaml():
    """Verify workflows with only comments raise WorkflowParsingError."""
    comment_yaml = "# Just a header comment\n# Another comment line\n"
    with pytest.raises(WorkflowParsingError, match="empty or contains only comments"):
        parse_workflow(comment_yaml)


def test_malformed_syntax_yaml():
    """Verify broken indentation or unclosed strings raise WorkflowParsingError."""
    broken_yaml = """
    name: Broken CI
    on: [push
    jobs:
      build:
        runs-on: ubuntu-latest
    """
    with pytest.raises(WorkflowParsingError, match="YAML syntax parsing error"):
        parse_workflow(broken_yaml)


def test_payload_size_limit():
    """Verify oversized payloads exceeding 1MB are rejected defensively."""
    oversized = "a" * (1024 * 1024 + 50)
    with pytest.raises(WorkflowParsingError, match="exceeds maximum size limit"):
        parse_workflow(oversized)


# --- 2. Unexpected Root Types & Security Tests ---

def test_unexpected_root_types():
    """Verify non-dictionary root elements (lists, scalars) are rejected."""
    list_yaml = "- item 1\n- item 2\n"
    with pytest.raises(WorkflowParsingError, match="Root must be a dictionary/mapping"):
        parse_workflow(list_yaml)

    scalar_yaml = "just a plain string"
    with pytest.raises(WorkflowParsingError, match="Root must be a dictionary/mapping"):
        parse_workflow(scalar_yaml)

    number_yaml = "42"
    with pytest.raises(WorkflowParsingError, match="Root must be a dictionary/mapping"):
        parse_workflow(number_yaml)


def test_safe_parsing_blocks_unsafe_deserialization():
    """Verify arbitrary Python code execution tags are strictly blocked."""
    unsafe_yaml = """
    name: Exploit
    exploit: !!python/object/apply:os.system ['echo PWNED']
    jobs:
      test:
        runs-on: ubuntu-latest
        steps:
          - run: echo safe
    """
    with pytest.raises(WorkflowParsingError, match="YAML syntax parsing error"):
        parse_workflow(unsafe_yaml)


def test_shell_commands_never_executed():
    """Verify dangerous shell scripts in 'run:' steps are parsed as inert strings and not run."""
    hostile_yaml = """
    name: Hostile Shell Test
    on: push
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - name: Potentially destructive command
            run: rm -rf /tmp/test-fake-path-nonexistent
    """
    parsed = parse_workflow(hostile_yaml)
    assert parsed.name == "Hostile Shell Test"
    step = parsed.jobs["build"].steps[0]
    assert step.run == "rm -rf /tmp/test-fake-path-nonexistent"
    assert step.is_run_command is True


# --- 3. YAML 1.1 Quirk & Trigger Normalization ---

def test_unquoted_on_boolean_normalization():
    """Verify unquoted 'on:' (which PyYAML parses as True) is normalized to 'on'."""
    unquoted_yaml = """
    name: Normalize Test
    on:
      push:
        branches: [main]
      pull_request:
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - run: echo ok
    """
    parsed = parse_workflow(unquoted_yaml)
    assert "push" in parsed.triggers
    assert "pull_request" in parsed.triggers
    assert "push" in parsed.trigger_details


def test_trigger_formats():
    """Verify string, list, and dictionary trigger formats are normalized correctly."""
    # 1. String trigger
    str_yaml = "name: T\non: push\njobs:\n  b:\n    runs-on: u\n    steps: []"
    p1 = parse_workflow(str_yaml)
    assert p1.triggers == ["push"]

    # 2. List trigger
    list_yaml = "name: T\non: [push, release]\njobs:\n  b:\n    runs-on: u\n    steps: []"
    p2 = parse_workflow(list_yaml)
    assert p2.triggers == ["push", "release"]


# --- 4. Action Reference & Pinning Tests ---

def test_action_reference_parsing():
    """Verify parsing of official, third-party, docker, local, and reusable actions."""
    # 1. Official action pinned with 40-char SHA
    sha_action = "actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11"
    ref1 = parse_action_reference(sha_action)
    assert ref1.kind == "github_action"
    assert ref1.owner == "actions"
    assert ref1.repo == "checkout"
    assert ref1.is_pinned_sha is True
    assert ref1.is_official is True

    # 2. Official action unpinned (floating tag)
    tag_action = "actions/setup-python@v5"
    ref2 = parse_action_reference(tag_action)
    assert ref2.kind == "github_action"
    assert ref2.ref == "v5"
    assert ref2.is_pinned_sha is False
    assert ref2.is_official is True

    # 3. Third-party unpinned
    third_party = "community-org/custom-action@master"
    ref3 = parse_action_reference(third_party)
    assert ref3.kind == "github_action"
    assert ref3.owner == "community-org"
    assert ref3.is_pinned_sha is False
    assert ref3.is_official is False

    # 4. Docker action
    docker_act = "docker://alpine:3.18"
    ref4 = parse_action_reference(docker_act)
    assert ref4.kind == "docker"
    assert ref4.repo == "alpine:3.18"

    # 5. Local action
    local_act = "./.github/actions/internal-tool"
    ref5 = parse_action_reference(local_act)
    assert ref5.kind == "local"

    # 6. Reusable workflow
    reusable = "octocat/shared-repo/.github/workflows/deploy.yml@v1"
    ref6 = parse_action_reference(reusable)
    assert ref6.kind == "reusable_workflow"
    assert ref6.owner == "octocat"
    assert ref6.repo == "shared-repo"


# --- 5. Secret Reference Detection ---

def test_secret_reference_extraction():
    """Verify secrets references are detected across env, with, run, and if expressions."""
    workflow_yaml = """
    name: Secrets Test
    on: push
    jobs:
      deploy:
        runs-on: ubuntu-latest
        environment: production
        env:
          TOP_SECRET: ${{ secrets.DEPLOY_TOKEN }}
        steps:
          - uses: actions/checkout@v4
          - name: Run script with secret
            if: ${{ secrets.FEATURE_FLAG == 'true' }}
            env:
              API_KEY: ${{ secrets.PROD_API_KEY }}
            run: |
              echo "Token is ${{ secrets.GITHUB_TOKEN }}"
          - name: Third party with secret
            uses: some/action@v1
            with:
              auth: ${{ secrets.NPM_AUTH_TOKEN }}
    """
    parsed = parse_workflow(workflow_yaml)
    expected_secrets = {
        "DEPLOY_TOKEN", "FEATURE_FLAG", "PROD_API_KEY",
        "GITHUB_TOKEN", "NPM_AUTH_TOKEN"
    }
    assert set(parsed.all_secrets_referenced) == expected_secrets
    assert "DEPLOY_TOKEN" in parsed.jobs["deploy"].secrets_referenced


# --- 6. Complex Structural Features (Jobs, Runners, Dependencies, Permissions) ---

def test_complex_job_structures():
    """Verify job dependencies, runners, environments, timeouts, and permissions."""
    workflow_yaml = """
    name: Complex Pipeline
    on: [push]
    permissions:
      contents: read
      id-token: write
    jobs:
      lint:
        runs-on: ubuntu-latest
        steps:
          - run: flake8 .
      build:
        name: Build and Matrix Test
        needs: lint
        runs-on: [self-hosted, linux, x64]
        timeout-minutes: 45
        continue-on-error: true
        environment:
          name: staging
          url: https://staging.example.com
        permissions: write-all
        env:
          BUILD_ENV: test
        steps:
          - uses: actions/checkout@v4
          - run: make build
    """
    parsed = parse_workflow(workflow_yaml)
    assert parsed.total_jobs == 2
    assert parsed.total_steps == 3
    assert parsed.permissions == {"contents": "read", "id-token": "write"}

    build_job = parsed.jobs["build"]
    assert build_job.name == "Build and Matrix Test"
    assert build_job.needs == ["lint"]
    assert build_job.runs_on == ["self-hosted", "linux", "x64"]
    assert build_job.timeout_minutes == 45
    assert build_job.continue_on_error is True
    assert build_job.permissions == "write-all"
    assert isinstance(build_job.environment, dict)


# --- 7. Validation Against Actual Dataset Workflows ---

def test_parse_authentic_dataset_workflows():
    """Verify that all authentic normal workflows in dataset/normal/ parse cleanly."""
    normal_dir = os.path.join(DATASET_DIR, "normal")
    assert os.path.exists(normal_dir)
    yaml_files = [f for f in os.listdir(normal_dir) if f.endswith(".yaml") or f.endswith(".yml")]
    assert len(yaml_files) >= 13

    for fname in yaml_files:
        filepath = os.path.join(normal_dir, fname)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        parsed = parse_workflow(content)
        assert isinstance(parsed, ParsedWorkflow)
        assert parsed.total_jobs > 0, f"Workflow {fname} has 0 jobs"
        assert len(parsed.triggers) > 0 or len(parsed.warnings) > 0


def test_parse_anomalous_dataset_workflows():
    """Verify that anomalous workflows in dataset/anomalous/ parse cleanly and capture deviations."""
    anomalous_dir = os.path.join(DATASET_DIR, "anomalous")
    assert os.path.exists(anomalous_dir)
    yaml_files = [f for f in os.listdir(anomalous_dir) if f.endswith(".yaml") or f.endswith(".yml")]
    assert len(yaml_files) >= 15

    for fname in yaml_files:
        filepath = os.path.join(anomalous_dir, fname)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        parsed = parse_workflow(content)
        assert isinstance(parsed, ParsedWorkflow)
        assert parsed.total_jobs > 0, f"Anomalous workflow {fname} has 0 jobs"
