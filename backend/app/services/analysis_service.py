"""Analysis Service coordinating parsing, feature extraction, ML inference, diffing, and storage.

Serves as the central integration layer for the GitHub Actions anomaly detection engine.
"""

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import uuid

from backend.app.comparator.engine import compare_workflows
from backend.app.comparator.models import ComparisonResult
from backend.app.features.feature_extractor import extract_features
from backend.app.models.anomaly_detector import get_detector
from backend.app.parser.models import ParsedWorkflow, WorkflowParsingError
from backend.app.parser.workflow_parser import parse_workflow_string
from backend.app.schemas.analysis import (
    AnalysisResponse,
    FeatureDeviation,
    WorkflowSummary,
)
from backend.app.storage.database import save_analysis_record


def build_findings_and_warnings(
    current_wf: ParsedWorkflow,
    features: Dict[str, float],
    comparison_result: Optional[ComparisonResult],
    top_deviations: List[Dict[str, Any]],
) -> Tuple[List[str], List[str], List[str], List[str]]:
    """Synthesize human-readable findings, explanations, security warnings, and recommendations."""
    findings: List[str] = []
    explanations: List[str] = []
    warnings: List[str] = []
    recommendations: List[str] = []

    # 1. Structural Findings
    findings.append(
        f"Workflow contains {current_wf.total_jobs} discrete job(s) and {current_wf.total_steps} step(s) "
        f"triggered by {', '.join(current_wf.triggers) if current_wf.triggers else 'unspecified triggers'}."
    )
    if current_wf.all_secrets_referenced:
        findings.append(
            f"Workflow references {len(current_wf.all_secrets_referenced)} secret(s): {', '.join(sorted(current_wf.all_secrets_referenced)[:5])}"
            + ("..." if len(current_wf.all_secrets_referenced) > 5 else "")
        )

    # 2. Security Warnings
    if features.get("has_broad_write_permissions", 0) > 0:
        warnings.append(
            "Excessive Permissions: Workflow or job configures broad write permissions ('write-all'). "
            "This grants write access across all GitHub scopes, significantly increasing blast radius if a step is compromised."
        )
        recommendations.append("Apply the principle of least privilege: replace 'write-all' with specific scoped permissions (e.g., 'contents: read').")

    if features.get("has_id_token_write", 0) > 0:
        warnings.append(
            "OIDC Privilege: Workflow requests 'id-token: write' permission. "
            "Ensure this token is strictly required for OpenID Connect (OIDC) cloud federation (AWS/GCP/Azure) and not exposed to untrusted steps."
        )

    if features.get("has_pull_request_target", 0) > 0:
        warnings.append(
            "Dangerous Trigger: Workflow listens on 'pull_request_target'. "
            "This trigger runs in the context of the base repository with access to secrets. Checking out untrusted PR head code creates a severe code execution vulnerability."
        )
        recommendations.append("Ensure 'pull_request_target' workflows never check out or execute code from untrusted fork pull requests.")

    if features.get("has_curl_or_wget_step", 0) > 0:
        warnings.append(
            "Network Script Execution: Shell steps execute network utilities ('curl' or 'wget'). "
            "Piping downloaded scripts directly to bash or running unverified external scripts introduces supply chain risks."
        )
        recommendations.append("Download external binaries using verified GitHub Actions or verify cryptographic checksums before executing shell scripts.")

    if features.get("has_self_hosted_runner", 0) > 0:
        warnings.append(
            "Runner Configuration: Workflow specifies self-hosted runners. "
            "Self-hosted runners can persist state between runs and present privilege escalation pathways on shared infrastructure."
        )
        recommendations.append("Ensure self-hosted runners are ephemeral, containerized, and restricted to trusted repository workflows.")

    unpinned_count = int(features.get("unpinned_actions_count", 0))
    if unpinned_count > 0:
        warnings.append(
            f"Action Pinning: Detected {unpinned_count} third-party action(s) referencing mutable branch or tag names. "
            "Mutable tags can be re-pointed or compromised by upstream maintainers."
        )
        recommendations.append("Pin all third-party actions to immutable 40-character commit SHAs (e.g., actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11).")

    # 3. Explanations of Anomalous Indicators
    if top_deviations:
        explanations.append("Statistical feature deviations that most influenced the structural anomaly score:")
        for dev in top_deviations:
            feat_name = dev["feature"]
            feat_val = dev["value"]
            z_score = dev["z_score"]
            desc = dev.get("description", "")
            explanations.append(f"- {feat_name} = {feat_val} (z-score: {z_score}): {desc}")
    else:
        explanations.append("All structural features fall within typical baseline variance ranges for open-source workflows.")

    # 4. Comparative Findings (if baseline provided)
    if comparison_result:
        summary = comparison_result.summary
        critical_count = sum(1 for d in comparison_result.differences if d.severity.value == "critical")
        high_count = sum(1 for d in comparison_result.differences if d.severity.value == "high")
        findings.append(
            f"Structural comparison against baseline revealed {summary.total_changes} difference(s) "
            f"({critical_count} critical, {high_count} high severity)."
        )
        for diff in comparison_result.differences:
            if diff.severity.value in ("critical", "high"):
                warnings.append(f"Comparative Deviation [{diff.severity.value.upper()}]: {diff.description} at {diff.location}")

    # General baseline recommendations
    if not recommendations:
        recommendations.append("Workflow adheres well to standard GitHub Actions security and structural conventions.")

    return findings, explanations, warnings, recommendations


def perform_analysis(
    workflow_yaml: str,
    filename: str = "workflow.yml",
    baseline_yaml: Optional[str] = None,
    baseline_filename: Optional[str] = None,
    db_path: Optional[Path] = None,
) -> AnalysisResponse:
    """Execute complete analysis pipeline: parsing, feature extraction, ML scoring, diffing, and persistence."""
    analysis_id = f"ana_{uuid.uuid4().hex[:12]}"
    created_at = datetime.now(timezone.utc).isoformat()

    # 1. Parse analyzed workflow
    current_wf = parse_workflow_string(workflow_yaml, filename=filename)

    # 2. Extract 30 structural features
    features = extract_features(current_wf)

    # 3. ML Anomaly Detection (Unsupervised Isolation Forest)
    detector = get_detector()
    ml_result = detector.predict_workflow(current_wf)

    # 4. Optional AST Comparison if baseline provided
    comparison_result: Optional[ComparisonResult] = None
    structural_diffs = None
    comp_summary = None

    if baseline_yaml and baseline_yaml.strip():
        baseline_wf = parse_workflow_string(baseline_yaml, filename=baseline_filename or "baseline.yml")
        comparison_result = compare_workflows(baseline_wf, current_wf)
        structural_diffs = comparison_result.differences
        comp_summary = comparison_result.summary

    # 5. Build human-readable findings, explanations, warnings, recommendations
    findings, explanations, warnings, recommendations = build_findings_and_warnings(
        current_wf=current_wf,
        features=features,
        comparison_result=comparison_result,
        top_deviations=ml_result.top_contributing_features,
    )

    # 6. Extract runner list (handling both str and list runs-on types)
    runners_set = set()
    for job in current_wf.jobs.values():
        if isinstance(job.runs_on, str):
            runners_set.add(job.runs_on)
        elif isinstance(job.runs_on, (list, tuple)):
            for r in job.runs_on:
                runners_set.add(str(r))
    all_runners = sorted(list(runners_set))

    # 7. Workflow Summary
    workflow_summary = WorkflowSummary(
        name=current_wf.name or filename,
        total_jobs=current_wf.total_jobs,
        job_ids=list(current_wf.jobs.keys()),
        total_steps=current_wf.total_steps,
        triggers=current_wf.triggers,
        runners=all_runners,
        permissions=current_wf.permissions if isinstance(current_wf.permissions, dict) else ({"level": current_wf.permissions} if current_wf.permissions else {}),
        has_broad_write_permissions=bool(features.get("has_broad_write_permissions", 0) > 0),
        has_self_hosted_runner=bool(features.get("has_self_hosted_runner", 0) > 0),
    )

    # 8. Convert deviations to schema models
    deviations = [
        FeatureDeviation(
            feature=dev["feature"],
            value=dev["value"],
            z_score=dev["z_score"],
            description=dev.get("description", ""),
        )
        for dev in ml_result.top_contributing_features
    ]

    # 9. Build comprehensive response object
    response = AnalysisResponse(
        analysis_id=analysis_id,
        filename=filename,
        status="success",
        created_at=created_at,
        has_baseline=bool(baseline_yaml and baseline_yaml.strip()),
        baseline_filename=baseline_filename if (baseline_yaml and baseline_yaml.strip()) else None,
        workflow_summary=workflow_summary,
        anomaly_score=ml_result.anomaly_score,
        raw_score=ml_result.raw_score,
        threshold=ml_result.threshold,
        is_anomaly=ml_result.is_anomaly,
        classification=ml_result.classification,
        score_interpretation=ml_result.interpretation,
        model_version=detector.metadata.get("schema_version", "1.0.0"),
        model_type=detector.metadata.get("model_type", "IsolationForest"),
        extracted_features=features,
        top_contributing_deviations=deviations,
        structural_differences=structural_diffs,
        comparison_summary=comp_summary,
        findings=findings,
        explanations=explanations,
        warnings=warnings,
        recommendations=recommendations,
    )

    # 10. Persist to SQLite history
    total_diffs = comp_summary.total_changes if comp_summary else 0
    high_diffs = (
        sum(1 for d in structural_diffs if d.severity.value in ("critical", "high"))
        if structural_diffs
        else 0
    )

    save_analysis_record(
        analysis_id=analysis_id,
        filename=filename,
        has_baseline=response.has_baseline,
        baseline_filename=response.baseline_filename,
        status="success",
        anomaly_score=response.anomaly_score,
        classification=response.classification,
        score_interpretation=response.score_interpretation,
        model_version=response.model_version,
        total_jobs=current_wf.total_jobs,
        total_steps=current_wf.total_steps,
        total_differences=total_diffs,
        high_severity_differences=high_diffs,
        result_data=response.model_dump(),
        created_at=created_at,
        db_path=db_path,
    )

    return response
