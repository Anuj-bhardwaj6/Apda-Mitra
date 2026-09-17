'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Layers,
  Info,
  ChevronDown,
  ChevronUp,
  Cpu,
  Calendar,
  Waves,
  Gauge
} from 'lucide-react';
import {
  DisasterRiskAnalysisResponse,
  HistoricalWeatherSummary,
  EnsembleForecastSummary
} from '@/lib/api';

interface DisasterRiskDashboardCardProps {
  riskData: DisasterRiskAnalysisResponse | null;
  historicalData: HistoricalWeatherSummary | null;
  ensembleData: EnsembleForecastSummary | null;
  isLoading?: boolean;
  lang: 'en' | 'hi';
}

export const DisasterRiskDashboardCard: React.FC<DisasterRiskDashboardCardProps> = ({
  riskData,
  historicalData,
  ensembleData,
  isLoading = false,
  lang = 'en'
}) => {
  const [activeTab, setActiveTab] = useState<'reasons' | 'history' | 'ensemble' | 'ml'>('reasons');
  const [showFullDisclaimer, setShowFullDisclaimer] = useState(false);

  if (isLoading || !riskData) {
    return (
      <div className="w-full p-4 sm:p-5 rounded-[24px] bg-white dark:bg-[#131D2A] border border-[#E2E8F0] dark:border-[#24344B] animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded w-full" />
      </div>
    );
  }

  const isLow = riskData.risk_level === 'LOW';
  const isMedium = riskData.risk_level === 'MEDIUM';
  const isHigh = riskData.risk_level === 'HIGH';
  const isCritical = riskData.risk_level === 'CRITICAL';

  const badgeColor = isCritical
    ? 'bg-rose-600 text-white'
    : isHigh
    ? 'bg-orange-600 text-white'
    : isMedium
    ? 'bg-amber-600 text-white'
    : 'bg-emerald-600 text-white';

  const cardBorder = isCritical
    ? 'border-rose-300 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20'
    : isHigh
    ? 'border-orange-300 dark:border-orange-900 bg-orange-50/30 dark:bg-orange-950/20'
    : isMedium
    ? 'border-amber-300 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20'
    : 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-950/10';

  // SVG Chart Dimensions for Historical
  const historyList = historicalData?.daily_history || [];
  const maxRain = Math.max(...historyList.map((h) => h.precipitation_mm), 10);
  const chartHeight = 120;
  const barWidth = Math.max(12, Math.floor(260 / Math.max(historyList.length, 1)));

  // SVG Chart Dimensions for Ensemble
  const ensembleList = ensembleData?.daily_forecast || [];
  const maxEnsRain = Math.max(...ensembleList.map((e) => e.precip_max_mm), 15);

  return (
    <div className={`w-full p-4 sm:p-5 rounded-[24px] border ${cardBorder} shadow-xs space-y-3.5 transition-all`}>
      {/* 1. Header & Live Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black tracking-wide ${badgeColor} shadow-2xs`}>
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>{riskData.risk_level} RISK</span>
          </span>
          <span className="text-xs font-extrabold text-[#1F2937] dark:text-white">
            {riskData.overall_risk_score} / 100
          </span>
        </div>

        <span className="text-[10px] font-bold text-gray-500 bg-white/80 dark:bg-black/30 px-2 py-0.5 rounded-full border border-black/5 dark:border-white/5">
          {lang === 'hi' ? 'पर्यावरणीय जोखिम सूचकांक' : 'Multi-Factor Risk Index'}
        </span>
      </div>

      {/* 2. Headline & Guidance */}
      <div>
        <h2 className="text-base sm:text-lg font-black text-[#1F2937] dark:text-white leading-tight">
          {lang === 'hi' ? riskData.headline_hi : riskData.headline}
        </h2>
        <p className="text-xs font-medium text-[#4B5563] dark:text-[#CBD5E1] mt-1 leading-relaxed">
          {riskData.action_guidance}
        </p>
      </div>

      {/* 3. Mandatory Early-Warning Disclaimer Banner */}
      <div className="p-2.5 rounded-xl bg-white/90 dark:bg-[#131D2A] border border-amber-300 dark:border-amber-800/80 text-[11px] text-amber-900 dark:text-amber-200 flex items-start space-x-2">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 leading-tight">
          <span className="font-bold">
            {lang === 'hi' ? 'पूर्व-चेतावनी सूचकांक (गारंटी नहीं): ' : 'Advisory Early-Warning Indicator: '}
          </span>
          <span>
            {showFullDisclaimer
              ? riskData.disclaimer
              : (lang === 'hi'
                  ? 'यह ओपन-मेटियो मौसम, नदी बहाव एवं भू-ढलान आंकड़ों का जोखिम सूचकांक है। यह आपदा की गारंटी नहीं देता।'
                  : 'Calculated from live Open-Meteo, GloFAS, and Copernicus DEM feeds. Does not predict or guarantee disaster occurrence.')}
          </span>
          <button
            onClick={() => setShowFullDisclaimer(!showFullDisclaimer)}
            className="ml-1 text-[#0F4C81] dark:text-[#81D4FA] font-bold hover:underline cursor-pointer inline"
          >
            {showFullDisclaimer ? (lang === 'hi' ? 'संक्षेप' : 'Less') : (lang === 'hi' ? 'विस्तार' : 'Full Disclaimer')}
          </button>
        </div>
      </div>

      {/* 4. Score Progress Bar */}
      <div className="space-y-1">
        <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full transition-all duration-700 rounded-full ${
              isCritical
                ? 'bg-rose-600'
                : isHigh
                ? 'bg-orange-500'
                : isMedium
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(4, riskData.overall_risk_score))}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 font-semibold px-0.5">
          <span>0 (Low)</span>
          <span>30 (Medium)</span>
          <span>60 (High)</span>
          <span>80+ (Critical)</span>
        </div>
      </div>

      {/* 5. Navigation Tab Switcher */}
      <div className="pt-1 border-t border-gray-200 dark:border-gray-800 grid grid-cols-4 gap-1 text-[11px] font-bold">
        <button
          onClick={() => setActiveTab('reasons')}
          className={`py-1.5 px-1 rounded-lg transition-colors cursor-pointer text-center truncate ${
            activeTab === 'reasons'
              ? 'bg-[#0F4C81] text-white shadow-2xs'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 bg-white/60 dark:bg-black/20'
          }`}
        >
          {lang === 'hi' ? 'कारण' : 'Reasons'}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`py-1.5 px-1 rounded-lg transition-colors cursor-pointer text-center truncate ${
            activeTab === 'history'
              ? 'bg-[#0F4C81] text-white shadow-2xs'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 bg-white/60 dark:bg-black/20'
          }`}
        >
          {lang === 'hi' ? 'इतिहास' : 'History'}
        </button>

        <button
          onClick={() => setActiveTab('ensemble')}
          className={`py-1.5 px-1 rounded-lg transition-colors cursor-pointer text-center truncate ${
            activeTab === 'ensemble'
              ? 'bg-[#0F4C81] text-white shadow-2xs'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 bg-white/60 dark:bg-black/20'
          }`}
        >
          {lang === 'hi' ? 'एन्सेम्बल' : 'Ensemble'}
        </button>

        <button
          onClick={() => setActiveTab('ml')}
          className={`py-1.5 px-1 rounded-lg transition-colors cursor-pointer text-center truncate ${
            activeTab === 'ml'
              ? 'bg-[#0F4C81] text-white shadow-2xs'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 bg-white/60 dark:bg-black/20'
          }`}
        >
          {lang === 'hi' ? 'एमएल' : 'AI / ML'}
        </button>
      </div>

      {/* 6. Tab Content Panels */}
      {/* Panel 1: Explainable Risk Factors */}
      {activeTab === 'reasons' && (
        <div className="space-y-2 pt-1 animate-in fade-in">
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-bold px-1">
            <span>{lang === 'hi' ? 'योगदान देने वाले कारक' : 'Contributing Factor Breakdown'}</span>
            <span>{lang === 'hi' ? 'जोखिम अंक' : 'Score Impact'}</span>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {riskData.reasons.map((r, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-white dark:bg-[#1B2738] border border-[#E2E8F0] dark:border-[#24344B] space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-[#1F2937] dark:text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0F4C81] dark:bg-[#81D4FA]" />
                    <span>{lang === 'hi' ? r.title_hi : r.title}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        r.severity === 'critical'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : r.severity === 'high'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                          : r.severity === 'medium'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {r.severity}
                    </span>
                    <span className="text-[11px] font-extrabold text-[#0F4C81] dark:text-[#81D4FA]">
                      +{r.score_contribution} pts
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                  {r.description}
                </p>

                <div className="flex justify-between items-center text-[10px] text-gray-500 pt-0.5">
                  <span>Category: <strong>{r.category}</strong></span>
                  <span>Value: <strong>{r.metric_value}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel 2: Historical Weather Trends Chart */}
      {activeTab === 'history' && (
        <div className="space-y-2.5 pt-1 animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-700 dark:text-gray-300">
              {lang === 'hi' ? '14-दिवसीय वर्षा संचय' : '14-Day Historical Rainfall & Temp'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF3FA] dark:bg-[#1B2738] text-[#0F4C81] dark:text-[#81D4FA]">
              Trend: {historicalData?.rainfall_trend || 'Stable'}
            </span>
          </div>

          {/* SVG Bar & Line Chart */}
          <div className="p-3 bg-white dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B] space-y-2">
            <div className="h-32 w-full flex items-end justify-between space-x-1 pt-4 pb-1">
              {historyList.map((step, idx) => {
                const heightPct = Math.min(100, Math.max(5, (step.precipitation_mm / maxRain) * 100));
                const dayLabel = step.date.slice(8); // '05'
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 hidden group-hover:flex flex-col items-center z-20 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                      <span>{step.precipitation_mm}mm</span>
                      <span>{step.temp_max_c}°C</span>
                    </div>

                    <div
                      className={`w-full max-w-[18px] rounded-t transition-all ${
                        step.precipitation_mm >= 25
                          ? 'bg-rose-500'
                          : step.precipitation_mm >= 10
                          ? 'bg-blue-600'
                          : 'bg-blue-400'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[8px] text-gray-400 mt-1 font-semibold">{dayLabel}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-1.5">
              <span>Total Rain: <strong>{historicalData?.total_rainfall_mm ?? 64.8} mm</strong></span>
              <span>AMI Decay: <strong>{historicalData?.ml_feature_vector?.antecedent_moisture_index ?? 22.4}</strong></span>
              <span>Mean Temp: <strong>{historicalData?.mean_temperature_c ?? 23.0}°C</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Panel 3: Ensemble Forecast Uncertainty Chart */}
      {activeTab === 'ensemble' && (
        <div className="space-y-2.5 pt-1 animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-700 dark:text-gray-300">
              {ensembleData?.model_name || 'Ensemble Forecast (40 Members)'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {ensembleData?.overall_confidence_pct ?? 86.5}% Confidence
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B] space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {ensembleList.map((ens, idx) => (
                <div key={idx} className="p-2 bg-gray-50 dark:bg-slate-800/60 rounded-lg text-center space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 block">{ens.date}</span>
                  <div className="text-xs font-black text-[#1F2937] dark:text-white">
                    {ens.precip_mean_mm} mm
                  </div>
                  <div className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold">
                    Spread: {ens.precip_min_mm}-{ens.precip_max_mm}mm
                  </div>
                  <div className="text-[9px] text-gray-400">
                    Conf: {ens.confidence_pct}%
                  </div>
                </div>
              ))}
            </div>

            {/* Exceedance Probabilities Strip */}
            <div className="p-2 rounded-lg bg-[#F8FAFC] dark:bg-[#14202E] border border-gray-200 dark:border-gray-800 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                Precipitation Exceedance Probability (Next 48 Hours)
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div>
                  <span className="text-gray-400 block text-[9px]">&gt; 10 mm</span>
                  <strong className="text-[#1F2937] dark:text-white">{ensembleData?.exceedance_prob_10mm_pct ?? 28}%</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[9px]">&gt; 25 mm</span>
                  <strong className="text-amber-600 dark:text-amber-400">{ensembleData?.exceedance_prob_25mm_pct ?? 5}%</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[9px]">&gt; 50 mm</span>
                  <strong className="text-rose-600 dark:text-rose-400">{ensembleData?.exceedance_prob_50mm_pct ?? 0}%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel 4: AI/ML Feature Training Vector */}
      {activeTab === 'ml' && (
        <div className="space-y-2 pt-1 animate-in fade-in text-xs">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5 font-bold text-gray-700 dark:text-gray-300">
              <Cpu className="w-3.5 h-3.5 text-[#0F4C81] dark:text-[#81D4FA]" />
              <span>{lang === 'hi' ? 'प्रशिक्षण डेटा संरचना' : 'Structured Feature Vector for ML'}</span>
            </div>
            <span className="text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded-full">
              Normalized [0.0, 1.0]
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-[#1B2738] rounded-xl border border-[#E2E8F0] dark:border-[#24344B] space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(historicalData?.ml_feature_vector?.normalized_features || {}).map(([key, val]) => (
                <div key={key} className="p-1.5 bg-gray-50 dark:bg-slate-800 rounded border border-gray-100 dark:border-gray-700 text-center">
                  <span className="text-[9px] text-gray-500 font-mono block truncate">{key}</span>
                  <span className="text-xs font-black font-mono text-[#0F4C81] dark:text-[#81D4FA]">{val}</span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-gray-400 italic">
              Pre-computed antecedent moisture index (AMI) and multi-day cumulative precipitation ready for scikit-learn / XGBoost training.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
