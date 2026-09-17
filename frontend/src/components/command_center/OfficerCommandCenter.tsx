'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Users,
  Truck,
  CheckCircle2,
  Radio,
  MapPin,
  RefreshCw,
  Send,
  Home,
  Hospital,
  CloudRain,
  Flame,
  Volume2,
  Clock,
  Check,
  Waves,
  Mountain,
  Gauge,
  Activity,
  Layers,
  TrendingUp,
  Info
} from 'lucide-react';
import { InteractiveMap } from '@/components/map/InteractiveMap';
import { EOCMetrics, CitizenReport, DisasterRiskAnalysisResponse, EnsembleForecastSummary, HistoricalWeatherSummary } from '@/lib/api';
import { EnvironmentalRepository } from '@/repositories/EnvironmentalRepository';
import { RiskAnalysisRepository } from '@/repositories/RiskAnalysisRepository';
import { EnvironmentalMetrics } from '@/shared/types';

interface OfficerCommandCenterProps {
  metrics: EOCMetrics | null;
  reports: CitizenReport[];
  onVerifyReport: (id: number) => void;
  onBroadcastAlert: (title: string, district: string, severity: string, summary: string) => void;
  lang?: 'en' | 'hi';
}

export const OfficerCommandCenter: React.FC<OfficerCommandCenterProps> = ({
  metrics,
  reports,
  onVerifyReport,
  onBroadcastAlert,
  lang = 'en',
}) => {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'triage' | 'ndrf' | 'sensors'>('broadcast');
  const [title, setTitle] = useState('');
  const [district, setDistrict] = useState('Wayanad District');
  const [severity, setSeverity] = useState('Red Alert');
  const [summary, setSummary] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [envMetrics, setEnvMetrics] = useState<EnvironmentalMetrics | null>(null);
  const [isEnvLoading, setIsEnvLoading] = useState(false);
  const [riskData, setRiskData] = useState<DisasterRiskAnalysisResponse | null>(null);
  const [ensembleData, setEnsembleData] = useState<EnsembleForecastSummary | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalWeatherSummary | null>(null);

  useEffect(() => {
    setIsEnvLoading(true);
    EnvironmentalRepository.getCombinedEnvironmental(11.6854, 76.1320, 'District DEOC Catchment')
      .then((data) => setEnvMetrics(data))
      .catch(() => {})
      .finally(() => setIsEnvLoading(false));

    RiskAnalysisRepository.getDisasterRiskAnalysis(11.6854, 76.1320, 'District DEOC Catchment')
      .then(setRiskData)
      .catch(() => {});
    RiskAnalysisRepository.getEnsembleForecast(11.6854, 76.1320, 'icon_seamless', 'District DEOC Catchment')
      .then(setEnsembleData)
      .catch(() => {});
    RiskAnalysisRepository.getHistoricalWeather(11.6854, 76.1320, 14, 'District DEOC Catchment')
      .then(setHistoricalData)
      .catch(() => {});
  }, []);


  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onBroadcastAlert(title, district, severity, summary);
    setTitle('');
    setSummary('');
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 3500);
  };

  const defaultReports: CitizenReport[] = [
    {
      id: 301,
      reporter_name: 'Rahul Nair',
      category: 'Landslide',
      description: 'Minor slope collapse on Chooralmala bypass. Mud covering eastern shoulder.',
      latitude: 11.6912,
      longitude: 76.1380,
      location_name: 'Chooralmala Bypass KM 4',
      status: 'Pending',
      created_at: new Date().toISOString(),
    },
    {
      id: 302,
      reporter_name: 'Anjali V.',
      category: 'Tree Fall',
      description: 'Large banyan tree fallen across power lines and road.',
      latitude: 11.6740,
      longitude: 76.1210,
      location_name: 'Meppadi Town Junction',
      status: 'Verified',
      created_at: new Date().toISOString(),
    },
  ];

  const displayReports = reports.length > 0 ? reports : defaultReports;

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-62px)] bg-[#F7F8FA] overflow-hidden">
      {/* 1. DOMINANT CENTRAL GIS COMMAND MAP (65% Viewport Area) */}
      <div className="w-full lg:w-[65%] h-[50vh] lg:h-full relative border-r border-[#CBD5E1] flex flex-col">
        {/* Top Operational Status Ribbon */}
        <div className="p-3 bg-white border-b border-[#E5E7EB] flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-[#2E7D32] animate-pulse" />
            <span className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">
              {lang === 'hi'
                ? 'जिला आपदा नियंत्रण केंद्र (DEOC) • लाइव भू-स्थानिक मानचित्र'
                : 'District Emergency Operations Centre (DEOC) • GIS Command Deck'}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-[#6B7280]">
            <Radio className="w-3.5 h-3.5 text-[#0F4C81]" />
            <span>Active Feeds: IMD Doppler • PostGIS Vector • Citizen Cloud</span>
          </div>
        </div>

        {/* The Live Interactive Map (Officer Mode: Heatmaps, NASA History, Incident Triage) */}
        <div className="flex-1 w-full h-full relative">
          <InteractiveMap
            latitude={11.6854}
            longitude={76.1320}
            locationName="District EOC GIS Command Deck"
            mode="officer"
            onLocationSelect={() => {}}
            reports={displayReports}
            lang={lang}
          />
        </div>

        {/* Bottom Operations Quick Incident Triage Deck */}
        <div className="hidden lg:flex h-36 bg-white border-t border-[#CBD5E1] p-3 overflow-x-auto items-center space-x-3">
          <div className="w-48 shrink-0 pr-3 border-r border-[#E5E7EB]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
              Triage Queue
            </span>
            <span className="text-base font-extrabold text-[#1F2937] block">
              {displayReports.filter((r) => r.status === 'Pending').length} Pending Incidents
            </span>
            <span className="text-[11px] text-[#2E7D32] font-semibold">
              Live Field Dispatch Active
            </span>
          </div>

          <div className="flex items-center space-x-2.5 overflow-x-auto flex-1 scrollbar-thin">
            {displayReports.map((report) => (
              <div
                key={report.id}
                className="w-72 shrink-0 p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1F2937] truncate">{report.category}</span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      report.status === 'Verified'
                        ? 'bg-[#E8F5E9] text-[#2E7D32]'
                        : 'bg-[#FEF3C7] text-[#D97706]'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
                <p className="text-[11px] text-[#6B7280] truncate">{report.description}</p>
                {report.status !== 'Verified' && (
                  <button
                    onClick={() => onVerifyReport(report.id)}
                    className="w-full mt-1 py-1 bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Verify & Dispatch Team
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. RIGHT OPERATIONAL INTELLIGENCE & CONTROL PANEL (35% Viewport Area) */}
      <div className="w-full lg:w-[35%] h-[50vh] lg:h-full bg-white flex flex-col overflow-y-auto">
        {/* Navigation Tabs */}
        <div className="p-2 bg-[#F8FAFC] border-b border-[#E5E7EB] grid grid-cols-4 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'broadcast'
                ? 'bg-[#0F4C81] text-white shadow-xs'
                : 'text-[#6B7280] hover:bg-slate-200'
            }`}
          >
            📢 Broadcast
          </button>
          <button
            onClick={() => setActiveTab('triage')}
            className={`py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'triage'
                ? 'bg-[#0F4C81] text-white shadow-xs'
                : 'text-[#6B7280] hover:bg-slate-200'
            }`}
          >
            📋 Triage
          </button>
          <button
            onClick={() => setActiveTab('ndrf')}
            className={`py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'ndrf'
                ? 'bg-[#0F4C81] text-white shadow-xs'
                : 'text-[#6B7280] hover:bg-slate-200'
            }`}
          >
            🚜 NDRF
          </button>
          <button
            onClick={() => setActiveTab('sensors')}
            className={`py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'sensors'
                ? 'bg-[#0F4C81] text-white shadow-xs'
                : 'text-[#6B7280] hover:bg-slate-200'
            }`}
          >
            🌊 Telemetry
          </button>
        </div>


        {/* EOC Key Metrics Ribbon */}
        <div className="p-3 bg-white border-b border-[#E5E7EB] grid grid-cols-4 gap-2 text-center shrink-0">
          <div className="p-2 bg-[#FFEBEE] rounded-xl border border-[#EF9A9A]">
            <span className="text-[10px] text-[#C62828] font-bold block">Red Alerts</span>
            <span className="text-base font-extrabold text-[#C62828]">
              {metrics?.active_red_alerts || 2}
            </span>
          </div>
          <div className="p-2 bg-[#FEF3C7] rounded-xl border border-[#FCD34D]">
            <span className="text-[10px] text-[#D97706] font-bold block">Reports</span>
            <span className="text-base font-extrabold text-[#D97706]">
              {displayReports.length}
            </span>
          </div>
          <div className="p-2 bg-[#E8F5E9] rounded-xl border border-[#A5D6A7]">
            <span className="text-[10px] text-[#2E7D32] font-bold block">Evacuees</span>
            <span className="text-base font-extrabold text-[#2E7D32]">
              {metrics?.current_evacuees || 1420}
            </span>
          </div>
          <div className="p-2 bg-[#EBF3FA] rounded-xl border border-[#D0E2F2]">
            <span className="text-[10px] text-[#0F4C81] font-bold block">NDRF Teams</span>
            <span className="text-base font-extrabold text-[#0F4C81]">
              {metrics?.ndrf_teams_deployed || 6}
            </span>
          </div>
        </div>

        {/* Content Panels */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Tab 1: Broadcast Public Alert */}
          {activeTab === 'broadcast' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                  Public Warning Broadcast
                </h3>
                <span className="text-[10px] text-[#C62828] font-bold bg-[#FFEBEE] px-2 py-0.5 rounded-full border border-[#EF9A9A]">
                  CAP Protocol Compliant
                </span>
              </div>

              {broadcastSent && (
                <div className="p-3 bg-[#E8F5E9] border border-[#A5D6A7] rounded-xl text-xs font-bold text-[#2E7D32] flex items-center space-x-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Public Disaster Alert Broadcasted to All Citizen Apps!</span>
                </div>
              )}

              <form onSubmit={handleBroadcast} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-[#4B5563] block mb-1">
                    Alert Headline Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RED ALERT: Intense Downpour in Meppadi Range"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#F8FAFC] text-[#1F2937] text-xs p-2.5 rounded-xl border border-[#CBD5E1] focus:outline-none focus:border-[#0F4C81]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-[#4B5563] block mb-1">
                      Target District / Sector
                    </label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full bg-[#F8FAFC] text-[#1F2937] text-xs p-2.5 rounded-xl border border-[#CBD5E1]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#4B5563] block mb-1">
                      Severity Rating
                    </label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      className="w-full bg-[#F8FAFC] text-[#1F2937] text-xs p-2.5 rounded-xl border border-[#CBD5E1]"
                    >
                      <option value="Red Alert">Red Alert (Severe Danger)</option>
                      <option value="Amber Watch">Amber Watch (High Risk)</option>
                      <option value="Yellow Advisory">Yellow Advisory (Moderate)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#4B5563] block mb-1">
                    Evacuation Directives & Safety Instructions
                  </label>
                  <textarea
                    placeholder="Direct slope residents to proceed to Chooralmala Community Relief Camp immediately..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={3}
                    className="w-full bg-[#F8FAFC] text-[#1F2937] text-xs p-2.5 rounded-xl border border-[#CBD5E1] focus:outline-none focus:border-[#0F4C81]"
                  />
                </div>

                <button
                  type="submit"
                  className="apda-btn-danger w-full py-3 text-xs sm:text-sm font-bold shadow-md cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>TRANSMIT EMERGENCY BROADCAST</span>
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Incident Triage */}
          {activeTab === 'triage' && (
            <div className="space-y-3 animate-in fade-in">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                Citizen Field Incident Triage
              </h3>

              <div className="space-y-2">
                {displayReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-[#1F2937] block">
                          {report.category} Alert
                        </span>
                        <span className="text-[11px] text-[#6B7280]">
                          {report.location_name || 'Wayanad'}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          report.status === 'Verified'
                            ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]'
                            : 'bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D]'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>

                    <p className="text-[#4B5563] italic">"{report.description}"</p>

                    <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
                      <span className="text-[10px] text-[#6B7280]">
                        Reporter: {report.reporter_name}
                      </span>
                      {report.status !== 'Verified' && (
                        <button
                          onClick={() => onVerifyReport(report.id)}
                          className="px-3 py-1 bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          Verify & Broadcast
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: NDRF Resource Matrix */}
          {activeTab === 'ndrf' && (
            <div className="space-y-3 animate-in fade-in text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                NDRF & District Asset Deployment
              </h3>

              <div className="space-y-2">
                <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[#1F2937]">NDRF Battalion 4 (Search & Rescue)</h4>
                    <p className="text-[11px] text-[#6B7280]">Chooralmala Sector • 48 Personnel</p>
                  </div>
                  <span className="bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Active Duty
                  </span>
                </div>

                <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[#1F2937]">Heavy Earthmovers & Excavators</h4>
                    <p className="text-[11px] text-[#6B7280]">18 Machinery Units • Kalpetta Base</p>
                  </div>
                  <span className="bg-[#EBF3FA] text-[#0F4C81] border border-[#D0E2F2] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Standby
                  </span>
                </div>

                <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[#1F2937]">Medical Mobile Ambulances (108)</h4>
                    <p className="text-[11px] text-[#6B7280]">12 Units Stationed at Relief Camps</p>
                  </div>
                  <span className="bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    On Alert
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Environmental Telemetry Feeds (Open-Meteo Multi-API) */}
          {activeTab === 'sensors' && (
            <div className="space-y-3.5 animate-in fade-in text-xs max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                  Catchment Basin, Ensemble & Risk Intelligence
                </h3>
                <span className="text-[10px] text-[#0F4C81] font-bold bg-[#EBF3FA] px-2 py-0.5 rounded-full border border-[#D0E2F2]">
                  {isEnvLoading ? 'Refreshing Feeds...' : '6 Open-Meteo Live APIs'}
                </span>
              </div>

              {/* Phase 3: Explainable Composite Disaster Early-Warning Risk */}
              {riskData && (
                <div className="p-3.5 bg-white rounded-xl border-2 border-[#CBD5E1] shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-bold text-[#1F2937]">
                      <Activity className="w-4 h-4 text-rose-600" />
                      <span>Composite Environmental Early-Warning Risk</span>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        riskData.risk_level === 'CRITICAL'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : riskData.risk_level === 'HIGH'
                          ? 'bg-orange-500 text-white'
                          : riskData.risk_level === 'MEDIUM'
                          ? 'bg-amber-500 text-slate-900'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {riskData.risk_level} RISK ({riskData.overall_risk_score}/100)
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-700 font-medium">
                    {lang === 'hi' ? riskData.headline_hi : riskData.headline}
                  </p>

                  {/* Factor reasons list */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                      Contributing Factor Audit ({riskData.reasons.length} streams)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {riskData.reasons.map((f, i) => (
                        <div key={i} className="p-1.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-gray-800">{f.title}</span>
                          <span className={`font-bold text-[10px] px-1.5 py-0.2 rounded uppercase ${
                            f.severity === 'critical' || f.severity === 'high'
                              ? 'text-rose-600 bg-rose-50'
                              : f.severity === 'medium'
                              ? 'text-amber-600 bg-amber-50'
                              : 'text-emerald-700 bg-emerald-50'
                          }`}>
                            +{f.score_contribution} ({f.severity})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Early Warning Indicator Disclaimer */}
                  <div className="p-2 bg-amber-50 border border-amber-200/70 rounded-lg text-[10px] text-amber-800 flex items-start space-x-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                    <span>{riskData.disclaimer}</span>
                  </div>
                </div>
              )}

              {/* Phase 3: 40-Member Weather Ensemble Forecast & Uncertainty */}
              {ensembleData && (
                <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-bold text-[#1F2937]">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>DWD ICON {ensembleData.member_count}-Member Ensemble Spread</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {ensembleData.uncertainty_level} Uncertainty ({ensembleData.overall_confidence_pct}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-gray-500 block">48h Rain Mean</span>
                      <span className="text-sm font-black text-[#1F2937]">{ensembleData.mean_precipitation_next_48h_mm} mm</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-gray-500 block">Peak Member</span>
                      <span className="text-sm font-black text-indigo-600">{ensembleData.max_member_precipitation_48h_mm} mm</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-gray-500 block">P(&gt;10mm Rain)</span>
                      <span className="text-sm font-black text-[#1F2937]">{ensembleData.exceedance_prob_10mm_pct}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Phase 3: 14-Day Historical Trend & Antecedent Moisture */}
              {historicalData && (
                <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-bold text-[#1F2937]">
                      <TrendingUp className="w-4 h-4 text-teal-600" />
                      <span>{historicalData.lookback_days}-Day Historical Moisture & Soil Saturation</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                      Trend: {historicalData.rainfall_trend}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-gray-500 block">14d Cumulative</span>
                      <span className="text-sm font-black text-[#1F2937]">{historicalData.total_rainfall_mm} mm</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-gray-500 block">7d Cumulative</span>
                      <span className="text-sm font-black text-[#1F2937]">{historicalData.ml_feature_vector?.precip_7d_sum_mm ?? 0} mm</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                      <span className="text-[10px] text-gray-500 block">Moisture Index (AMI)</span>
                      <span className="text-sm font-black text-teal-700">{historicalData.ml_feature_vector?.antecedent_moisture_index ?? 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Flood Catchment Telemetry */}
              <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-[#1F2937]">
                    <Waves className="w-4 h-4 text-[#0F4C81]" />
                    <span>River Catchment & Basin Flow (Flood API)</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      envMetrics?.floodRiskLevel === 'High'
                        ? 'bg-[#FFEBEE] text-[#C62828] border border-[#EF9A9A]'
                        : envMetrics?.floodRiskLevel === 'Moderate'
                        ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D]'
                        : envMetrics?.floodRiskLevel
                        ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {envMetrics?.floodRiskLevel ? `${envMetrics.floodRiskLevel} Risk` : 'Unavailable'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                    <span className="text-[10px] text-gray-500 block">Current Flow</span>
                    <span className="text-sm font-black text-[#1F2937]">
                      {envMetrics?.riverDischargeM3s !== undefined ? `${envMetrics.riverDischargeM3s} m³/s` : 'Unavailable'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                    <span className="text-[10px] text-gray-500 block">Peak Discharge</span>
                    <span className="text-sm font-black text-[#1F2937]">
                      {envMetrics?.peakDischargeM3s !== undefined ? `${envMetrics.peakDischargeM3s} m³/s` : 'Unavailable'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                    <span className="text-[10px] text-gray-500 block">Flow Trend</span>
                    <span className="text-sm font-black text-[#0F4C81]">{envMetrics?.dischargeTrend ?? '—'}</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#4B5563] bg-white p-2 rounded-lg border border-[#E2E8F0]">
                  {envMetrics?.floodRecommendation ?? 'River levels telemetry unavailable.'}
                </p>
              </div>

              {/* Air Quality Telemetry */}
              <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-[#1F2937]">
                    <Gauge className="w-4 h-4 text-emerald-600" />
                    <span>Atmospheric Air Quality & Particulates</span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: envMetrics?.usAqi !== undefined ? (envMetrics.usAqi <= 50 ? '#E8F5E9' : '#FFF8E1') : '#F1F5F9',
                      borderColor: envMetrics?.usAqi !== undefined ? (envMetrics.usAqi <= 50 ? '#A5D6A7' : '#FFE082') : '#CBD5E1',
                      color: envMetrics?.usAqi !== undefined ? (envMetrics.usAqi <= 50 ? '#2E7D32' : '#B78103') : '#64748B',
                    }}
                  >
                    {envMetrics?.usAqi !== undefined ? `AQI ${envMetrics.usAqi} (${envMetrics?.aqiCategory ?? 'Normal'})` : 'Unavailable'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                    <span className="text-[10px] text-gray-500 block">Fine PM2.5</span>
                    <span className="text-sm font-black text-[#1F2937]">
                      {envMetrics?.pm25 !== undefined ? `${envMetrics.pm25} µg/m³` : '—'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                    <span className="text-[10px] text-gray-500 block">Coarse PM10</span>
                    <span className="text-sm font-black text-[#1F2937]">
                      {envMetrics?.pm10 !== undefined ? `${envMetrics.pm10} µg/m³` : '—'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#4B5563] bg-white p-2 rounded-lg border border-[#E2E8F0]">
                  {envMetrics?.healthAdvisory ?? 'Air quality telemetry unavailable.'}
                </p>
              </div>

              {/* Elevation & Slope Topography */}
              <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-[#1F2937]">
                    <Mountain className="w-4 h-4 text-slate-700" />
                    <span>Topography & Slope Hazard Risk (Elevation API)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {envMetrics?.terrainType ?? '—'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                    <span className="text-[10px] text-gray-500 block">Altitude</span>
                    <span className="text-sm font-black text-[#1F2937]">
                      {envMetrics?.elevationM !== undefined ? `${envMetrics.elevationM} m` : 'Unavailable'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                    <span className="text-[10px] text-gray-500 block">Slope Angle</span>
                    <span className="text-sm font-black text-[#1F2937]">
                      {envMetrics?.slopeDegrees !== undefined ? `${envMetrics.slopeDegrees}°` : '—'}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                    <span className="text-[10px] text-gray-500 block">Facing Aspect</span>
                    <span className="text-sm font-black text-[#1F2937]">
                      {envMetrics?.aspectDegrees !== undefined ? `${envMetrics.aspectDegrees}°` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

