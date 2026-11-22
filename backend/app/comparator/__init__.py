"""Structural Comparison Engine for GitHub Actions Workflows."""

from backend.app.comparator.engine import compare_workflows
from backend.app.comparator.models import (
    ChangeCategory,
    ChangeSeverity,
    ComparisonResult,
    ComparisonSummary,
    StructuralDifference,
)

__all__ = [
    "ChangeCategory",
    "ChangeSeverity",
    "ComparisonResult",
    "ComparisonSummary",
    "StructuralDifference",
    "compare_workflows",
]
