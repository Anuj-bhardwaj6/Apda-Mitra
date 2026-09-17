"""
Model Deployment — Singleton Model Loader
==========================================
Thread-safe singleton for loading, validating, and caching the production
landslide prediction model and its preprocessing artifacts.

Features:
  - Thread-safe lazy loading with threading.Lock
  - Integrity validation using SHA-256 checksums from model_manifest.json
  - Version management and hot-reloading (reload_model)
  - Accessors for model metadata, feature rankings, and evaluation metrics
"""

from __future__ import annotations

import hashlib
import json
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import (
    FEATURE_LIST_FILENAME,
    LATEST_MODEL_DIR,
    METRICS_FILENAME,
    MODEL_FILENAME,
    MODEL_MANIFEST_FILENAME,
    MODELS_DIR,
    SCALER_FILENAME,
    TRAINING_CONFIG_FILENAME,
)
from ai.logger import PipelineLogger

log = PipelineLogger("deployment.load_model")


class ModelManager:
    """Thread-safe singleton managing the active XGBoost landslide model."""

    _instance: Optional[ModelManager] = None
    _lock = threading.Lock()

    def __new__(cls) -> ModelManager:
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(ModelManager, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if getattr(self, "_initialized", False):
            return

        self._model: Optional[Any] = None
        self._scaler: Optional[Any] = None
        self._manifest: Optional[Dict[str, Any]] = None
        self._metadata: Optional[Dict[str, Any]] = None
        self._metrics: Optional[Dict[str, Any]] = None
        self._feature_importance: Optional[Dict[str, float]] = None
        self._feature_list: Optional[List[str]] = None
        self._model_dir: Path = LATEST_MODEL_DIR
        self._load_lock = threading.Lock()
        self._initialized = True

    def _verify_checksum(self, file_path: Path, expected_hash: str) -> bool:
        """Verifies SHA-256 integrity of the model file."""
        if not file_path.exists() or not expected_hash:
            return False
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        actual_hash = hasher.hexdigest()
        is_valid = actual_hash.lower() == expected_hash.lower()
        if not is_valid:
            log.error(
                "Model integrity checksum mismatch",
                file=str(file_path),
                expected=expected_hash,
                actual=actual_hash,
            )
        return is_valid

    def load(self, model_dir: Optional[Path] = None, force_reload: bool = False) -> bool:
        """
        Loads the model and related artifacts into memory.

        Args:
            model_dir: Directory containing artifacts (defaults to LATEST_MODEL_DIR)
            force_reload: If True, forces re-reading from disk

        Returns:
            True if model successfully loaded, False otherwise
        """
        with self._load_lock:
            target_dir = model_dir or self._model_dir
            if self._model is not None and not force_reload and target_dir == self._model_dir:
                return True

            self._model_dir = target_dir
            log.info("Loading model artifacts from directory", path=str(self._model_dir))

            model_file = self._model_dir / MODEL_FILENAME
            manifest_file = self._model_dir / MODEL_MANIFEST_FILENAME

            if not model_file.exists():
                log.warning("Model binary not found on disk", path=str(model_file))
                return False

            # 1. Load and check manifest
            manifest_data = {}
            if manifest_file.exists():
                try:
                    with open(manifest_file, "r") as f:
                        manifest_data = json.load(f)
                    expected_sha = manifest_data.get("sha256")
                    if expected_sha:
                        if not self._verify_checksum(model_file, expected_sha):
                            log.warning("Model checksum verification failed; loading aborted")
                            return False
                    self._manifest = manifest_data
                except Exception as exc:
                    log.warning("Manifest read failed", error=str(exc))

            # 2. Load model
            try:
                self._model = joblib.load(model_file)
                log.info("XGBoost model loaded successfully")
            except Exception as exc:
                log.error("Failed to deserialize model binary", error=str(exc))
                return False

            # 3. Load scaler
            scaler_file = self._model_dir / SCALER_FILENAME
            if scaler_file.exists():
                try:
                    self._scaler = joblib.load(scaler_file)
                    log.info("Scaler loaded successfully")
                except Exception as exc:
                    log.warning("Failed to deserialize scaler", error=str(exc))

            # 4. Load metadata & config
            config_file = self._model_dir / TRAINING_CONFIG_FILENAME
            if config_file.exists():
                try:
                    with open(config_file, "r") as f:
                        self._metadata = json.load(f)
                except Exception:
                    pass

            # 5. Load evaluation metrics
            metrics_file = self._model_dir / METRICS_FILENAME
            if metrics_file.exists():
                try:
                    with open(metrics_file, "r") as f:
                        self._metrics = json.load(f)
                except Exception:
                    pass

            # 6. Load feature importances
            fi_file = self._model_dir / "feature_importance.json"
            if fi_file.exists():
                try:
                    with open(fi_file, "r") as f:
                        self._feature_importance = json.load(f)
                except Exception:
                    pass
            elif self._metrics and "feature_importances" in self._metrics:
                self._feature_importance = self._metrics["feature_importances"]

            # 7. Load feature list
            fl_file = self._model_dir / FEATURE_LIST_FILENAME
            if fl_file.exists():
                try:
                    with open(fl_file, "r") as f:
                        fl_raw = json.load(f)
                        if isinstance(fl_raw, list):
                            self._feature_list = fl_raw
                        elif isinstance(fl_raw, dict):
                            self._feature_list = fl_raw.get("features", [])
                except Exception:
                    pass

            log.info("Model loading sequence complete", version=self.get_version())
            return True

    def reload(self) -> bool:
        """Forces an eviction and reload of model artifacts."""
        log.info("Triggering model hot-reload")
        return self.load(force_reload=True)

    def is_loaded(self) -> bool:
        """Returns True if model binary is loaded in memory."""
        return self._model is not None

    def get_model(self) -> Optional[Any]:
        """Returns the loaded XGBoost model."""
        if self._model is None:
            self.load()
        return self._model

    def get_scaler(self) -> Optional[Any]:
        """Returns the loaded StandardScaler."""
        if self._scaler is None:
            self.load()
        return self._scaler

    def get_feature_list(self) -> List[str]:
        """Returns the list of expected input features."""
        if self._feature_list is None:
            self.load()
        return self._feature_list or FEATURE_COLUMNS

    def get_version(self) -> str:
        """Returns the current model version identifier."""
        if self._manifest and "version" in self._manifest:
            return str(self._manifest["version"])
        if self._metadata and "version" in self._metadata:
            return str(self._metadata["version"])
        return "v_production_default"

    def get_metadata(self) -> Dict[str, Any]:
        """Returns full metadata payload about the loaded model."""
        if self._model is None:
            self.load()
        return {
            "version": self.get_version(),
            "is_loaded": self.is_loaded(),
            "model_path": str(self._model_dir / MODEL_FILENAME),
            "manifest": self._manifest or {},
            "training_config": self._metadata or {},
            "metrics": self._metrics or {},
            "features_count": len(self._feature_list) if self._feature_list else 0,
        }

    def get_feature_importance(self) -> Dict[str, float]:
        """Returns sorted feature importance dictionary."""
        if self._feature_importance is None:
            self.load()
        if self._feature_importance:
            return self._feature_importance
        if self._metrics and "feature_importances" in self._metrics:
            return self._metrics["feature_importances"]
        return {}


# Global accessors
def get_model_manager() -> ModelManager:
    """Returns the ModelManager singleton."""
    return ModelManager()


def get_production_model() -> Tuple[Optional[Any], Optional[Any]]:
    """Returns (model, scaler) tuple."""
    mgr = get_model_manager()
    return mgr.get_model(), mgr.get_scaler()
