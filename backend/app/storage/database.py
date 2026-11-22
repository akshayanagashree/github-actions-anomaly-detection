"""SQLite Persistence Layer for Analysis History.

Provides robust, lightweight storage for GitHub Actions workflow analysis runs,
including metadata, anomaly scores, extracted features, and structural differences.
"""

from contextlib import contextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sqlite3
from typing import Any, Dict, Generator, List, Optional, Tuple

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent.parent / "history.db"
DB_PATH = Path(os.getenv("HISTORY_DB_PATH", str(DEFAULT_DB_PATH)))


@contextmanager
def get_db_connection(db_path: Optional[Path] = None) -> Generator[sqlite3.Connection, None, None]:
    """Provide a transactional SQLite connection with Row mapping."""
    target_path = db_path or DB_PATH
    target_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target_path), timeout=10.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(db_path: Optional[Path] = None) -> None:
    """Initialize SQLite database schema for analysis history."""
    target_path = db_path or DB_PATH
    with get_db_connection(target_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS analysis_history (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                has_baseline INTEGER NOT NULL DEFAULT 0,
                baseline_filename TEXT,
                status TEXT NOT NULL,
                anomaly_score REAL,
                classification TEXT,
                score_interpretation TEXT,
                model_version TEXT,
                total_jobs INTEGER DEFAULT 0,
                total_steps INTEGER DEFAULT 0,
                total_differences INTEGER DEFAULT 0,
                high_severity_differences INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                result_json TEXT NOT NULL
            )
            """
        )
        # Index on created_at for fast pagination
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at
            ON analysis_history (created_at DESC)
            """
        )


def save_analysis_record(
    analysis_id: str,
    filename: str,
    has_baseline: bool,
    baseline_filename: Optional[str],
    status: str,
    anomaly_score: Optional[float],
    classification: Optional[str],
    score_interpretation: Optional[str],
    model_version: Optional[str],
    total_jobs: int,
    total_steps: int,
    total_differences: int,
    high_severity_differences: int,
    result_data: Dict[str, Any],
    created_at: Optional[str] = None,
    db_path: Optional[Path] = None,
) -> str:
    """Insert a completed workflow analysis record into the database."""
    target_path = db_path or DB_PATH
    init_db(target_path)

    timestamp = created_at or datetime.now(timezone.utc).isoformat()
    result_json = json.dumps(result_data, default=str)

    with get_db_connection(target_path) as conn:
        conn.execute(
            """
            INSERT INTO analysis_history (
                id, filename, has_baseline, baseline_filename, status,
                anomaly_score, classification, score_interpretation, model_version,
                total_jobs, total_steps, total_differences, high_severity_differences,
                created_at, result_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                analysis_id,
                filename,
                1 if has_baseline else 0,
                baseline_filename,
                status,
                anomaly_score,
                classification,
                score_interpretation,
                model_version,
                total_jobs,
                total_steps,
                total_differences,
                high_severity_differences,
                timestamp,
                result_json,
            ),
        )
    return analysis_id


def get_analysis_by_id(analysis_id: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Retrieve an analysis record and its full detailed JSON result by ID."""
    target_path = db_path or DB_PATH
    init_db(target_path)

    with get_db_connection(target_path) as conn:
        cursor = conn.execute(
            "SELECT * FROM analysis_history WHERE id = ?",
            (analysis_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None

        result_dict = json.loads(row["result_json"])
        return result_dict


def list_analysis_history(
    limit: int = 50,
    offset: int = 0,
    db_path: Optional[Path] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    """List analysis runs with pagination, ordered newest first."""
    target_path = db_path or DB_PATH
    init_db(target_path)

    with get_db_connection(target_path) as conn:
        # Total count
        count_cursor = conn.execute("SELECT COUNT(*) AS total FROM analysis_history")
        total = count_cursor.fetchone()["total"]

        # Page query
        cursor = conn.execute(
            """
            SELECT id, filename, has_baseline, baseline_filename, status,
                   anomaly_score, classification, score_interpretation,
                   total_jobs, total_steps, total_differences, high_severity_differences,
                   created_at
            FROM analysis_history
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        )
        rows = cursor.fetchall()
        items = [
            {
                "analysis_id": row["id"],
                "filename": row["filename"],
                "has_baseline": bool(row["has_baseline"]),
                "baseline_filename": row["baseline_filename"],
                "status": row["status"],
                "anomaly_score": row["anomaly_score"],
                "classification": row["classification"],
                "score_interpretation": row["score_interpretation"],
                "total_jobs": row["total_jobs"],
                "total_steps": row["total_steps"],
                "total_differences": row["total_differences"],
                "high_severity_differences": row["high_severity_differences"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]
        return items, total
