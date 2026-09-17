from __future__ import annotations

import pytest
from unittest.mock import MagicMock, patch

import ai.scripts.training.train
from ai.scripts.training.retrain_pipeline import (
    dispatch_retraining_job,
    get_retraining_job_status,
    run_retraining_workflow,
)


def test_retraining_skipped_on_low_samples():
    """Ensures retraining is skipped when new samples < threshold and force=False."""
    res = run_retraining_workflow(min_samples=100, force=False, db_session=None)
    assert res["status"] == "SKIPPED"
    assert "Insufficient new verified samples" in res["message"]


def test_retrain_job_dispatch():
    """Ensures asynchronous job dispatch registers job and returns running state."""
    job = dispatch_retraining_job(min_samples=1000, force=False, db_session=None)
    assert "job_id" in job
    assert job["job_id"].startswith("retrain_")

    status = get_retraining_job_status(job["job_id"])
    assert status["job_id"] == job["job_id"]
    assert status["status"] in ["RUNNING", "SKIPPED", "COMPLETED"]


def test_rollback_on_metric_degradation():
    """Verifies that rollback triggers if new model drops AUC below tolerance."""
    with patch("ai.scripts.training.train.train") as mock_train:
        # Candidate model has very low AUC (0.50 vs baseline 0.85)
        mock_train.return_value = {
            "version": "v_test_degraded",
            "metrics": {"roc_auc": 0.50},
        }

        res = run_retraining_workflow(min_samples=0, force=True, db_session=None)
        # Should execute rollback because 0.50 is far worse than incumbent
        assert res["status"] == "ROLLED_BACK"
        assert "degraded AUC" in res["message"]
