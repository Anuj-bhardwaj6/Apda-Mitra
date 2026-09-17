"""
APDA MITRA — Test Suite for Explainable Prediction Utility (ml/predict.py)
========================================================================
Validates:
1. Prediction outputs: risk_probability, risk_level, top_contributing_features, explanation.
2. SHAP consistency: TreeExplainer additivity matches XGBoost margin.
3. Non-fabrication: Top contributing features are strictly sorted by actual SHAP values.
4. Risk thresholds documentation: experimental disclaimers and valid intervals.
5. Input flexibility: Feature aliases, partial overrides, and missing values.
"""

import json
from pathlib import Path
import unittest

import numpy as np
from ml.predict import (
    ApdaMitraPredictor,
    predict,
    get_predictor,
    DEFAULT_THRESHOLDS_PATH,
    DEFAULT_MODEL_PATH,
    CANONICAL_FEATURES,
)


class TestApdaMitraPredict(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.predictor = get_predictor()

    def test_model_and_thresholds_files_exist(self):
        """Ensure underlying model is intact and risk thresholds JSON is present."""
        self.assertTrue(DEFAULT_MODEL_PATH.exists(), f"Model missing at {DEFAULT_MODEL_PATH}")
        self.assertTrue(DEFAULT_THRESHOLDS_PATH.exists(), f"Thresholds missing at {DEFAULT_THRESHOLDS_PATH}")

    def test_thresholds_json_structure(self):
        """Validate experimental status and structure of risk_thresholds.json."""
        with open(DEFAULT_THRESHOLDS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertEqual(data.get("status"), "experimental")
        self.assertIn("_disclaimer", data)
        self.assertIn("thresholds", data)
        thresholds = data["thresholds"]

        for tier in ["low", "moderate", "high", "critical"]:
            self.assertIn(tier, thresholds)
            self.assertIn("min_probability", thresholds[tier])
            self.assertIn("max_probability", thresholds[tier])
            self.assertIn("level", thresholds[tier])

    def test_prediction_output_contract(self):
        """Verify predict returns required fields and types."""
        result = predict(
            latitude=30.3165,
            longitude=78.0322,
            date="2026-08-15",
            environmental_features={
                "rain_1d": 50.0,
                "rain_3d": 120.0,
                "rain_7d": 240.0,
                "rain_30d": 400.0,
                "soil_moisture": 0.38,
                "soil_moisture_anomaly": 1.5,
                "elevation": 1800.0,
                "slope": 32.0,
                "aspect": 170.0,
                "curvature": -0.1,
            },
        )

        # Output fields check
        self.assertIn("risk_probability", result)
        self.assertIn("risk_level", result)
        self.assertIn("top_contributing_features", result)
        self.assertIn("explanation", result)
        self.assertIn("full_report", result)
        self.assertIn("experimental_disclaimer", result)

        self.assertIsInstance(result["risk_probability"], float)
        self.assertGreaterEqual(result["risk_probability"], 0.0)
        self.assertLessEqual(result["risk_probability"], 1.0)
        self.assertIsInstance(result["risk_level"], str)
        self.assertIn(result["risk_level"], ["Low", "Moderate", "High", "Critical"])

        # Check top_contributing_features structure
        factors = result["top_contributing_features"]
        self.assertGreaterEqual(len(factors), 1)
        for factor in factors:
            self.assertIn("feature", factor)
            self.assertIn("display_name", factor)
            self.assertIn("shap_value", factor)
            self.assertIn("contribution_level", factor)
            self.assertIn(factor["contribution_level"], [
                "high contribution",
                "moderate contribution",
                "minor contribution",
                "high protective contribution",
                "moderate protective contribution",
                "protective / mitigating factor",
                "neutral",
            ])

    def test_shap_additivity_and_non_fabrication(self):
        """
        Verify that SHAP values are genuine and strictly additive:
        margin = base_value + sum(shap_values)
        probability = 1 / (1 + exp(-margin))
        """
        env = {
            "rain_1d": 40.0,
            "rain_3d": 100.0,
            "rain_7d": 200.0,
            "rain_30d": 350.0,
            "soil_moisture": 0.35,
            "soil_moisture_anomaly": 1.2,
            "elevation": 1500.0,
            "slope": 28.0,
            "aspect": 150.0,
            "curvature": -0.05,
        }

        df_raw, _ = self.predictor.prepare_feature_vector(env)
        df_scaled = self.predictor.scaler.transform(df_raw)

        # Expected value (base value)
        base_val = float(self.predictor.explainer.expected_value)
        sv = self.predictor.explainer(df_scaled).values[0]

        computed_margin = base_val + float(np.sum(sv))
        computed_prob = 1.0 / (1.0 + np.exp(-computed_margin))

        # Model's predict_proba
        model_prob = float(self.predictor.model.predict_proba(df_scaled)[0, 1])

        self.assertAlmostEqual(computed_prob, model_prob, places=4)

        # Verify that factor explanations match the real top SHAP values
        result = predict(30.3, 78.0, "2026-08-01", env)
        top_factors = result["top_contributing_features"]

        # Top factor must correspond to the max positive attribution
        max_feature = max(env.keys(), key=lambda k: result["shap_values"].get(k, -999))
        self.assertEqual(top_factors[0]["feature"], max_feature)

    def test_alias_handling(self):
        """Verify that human-friendly aliases are mapped to canonical feature names."""
        result = predict(
            latitude=27.5,
            longitude=88.5,
            date="2026-07-10",
            environmental_features={
                "rainfall_1d": 45.0,
                "rainfall_3d": 110.0,
                "rainfall_7d": 210.0,
                "rainfall_30d": 380.0,
                "sm": 0.36,
                "soil_moisture_anomaly": 1.2,
                "altitude": 1900.0,
                "slope_deg": 31.0,
                "aspect": 160.0,
                "curvature": -0.05,
            },
        )
        self.assertEqual(result["feature_values"]["rain_7d"], 210.0)
        self.assertEqual(result["feature_values"]["rain_1d"], 45.0)
        self.assertEqual(result["feature_values"]["soil_moisture"], 0.36)
        self.assertEqual(result["feature_values"]["elevation"], 1900.0)
        self.assertEqual(result["feature_values"]["slope"], 31.0)

    def test_low_risk_scenario(self):
        """Verify dry/flat scenario yields low risk."""
        result = predict(
            latitude=26.2,
            longitude=91.8,
            date="2026-01-15",
            environmental_features={
                "rain_1d": 0.0,
                "rain_3d": 0.0,
                "rain_7d": 0.0,
                "rain_30d": 5.0,
                "soil_moisture": 0.12,
                "soil_moisture_anomaly": -1.0,
                "elevation": 200.0,
                "slope": 5.0,
                "aspect": 90.0,
                "curvature": 0.0,
            },
        )
        self.assertEqual(result["risk_level"], "Low")
        self.assertLess(result["risk_probability"], 0.30)

    def test_explanation_formatting(self):
        """Verify formatted text matches the user's requested specification."""
        result = predict(
            latitude=30.4,
            longitude=79.1,
            date="2026-08-01",
            environmental_features={
                "rain_1d": 50.0,
                "rain_3d": 130.0,
                "rain_7d": 280.0,
                "rain_30d": 420.0,
                "soil_moisture": 0.40,
                "soil_moisture_anomaly": 1.6,
                "elevation": 2000.0,
                "slope": 35.0,
                "aspect": 170.0,
                "curvature": -0.15,
            },
        )

        full_rep = result["full_report"]
        self.assertIn("risk_score:", full_rep)
        self.assertIn("major factors:", full_rep)
        self.assertIn("1. ", full_rep)

    def test_never_fabricate_environmental_values(self):
        """Verify that omitting required features raises ValueError and never fabricates defaults."""
        incomplete_env = {
            "rain_7d": 280.0,
            "slope": 35.0,
        }
        with self.assertRaises(ValueError) as ctx:
            predict(30.4, 79.1, "2026-08-01", incomplete_env)

        err_msg = str(ctx.exception)
        self.assertIn("Missing required environmental feature", err_msg)
        self.assertIn("strictly forbids fabricating environmental values", err_msg)


if __name__ == "__main__":
    unittest.main()
