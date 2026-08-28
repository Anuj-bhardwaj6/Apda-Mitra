'use client';

import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { InteractiveMap } from '@/components/map/InteractiveMap';
import { EOCMetrics, CitizenReport } from '@/lib/api';

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
  const [activeTab, setActiveTab] = useState<'broadcast' | 'triage' | 'ndrf'>('broadcast');
  const [title, setTitle] = useState('');
  const [district, setDistrict] = useState('Wayanad District');
  const [severity, setSeverity] = useState('Red Alert');
  const [summary, setSummary] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

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
        <div className="p-2 bg-[#F8FAFC] border-b border-[#E5E7EB] grid grid-cols-3 gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'broadcast'
                ? 'bg-[#0F4C81] text-white shadow-xs'
                : 'text-[#6B7280] hover:bg-slate-200'
            }`}
          >
            📢 Broadcast Alert
          </button>
          <button
            onClick={() => setActiveTab('triage')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'triage'
                ? 'bg-[#0F4C81] text-white shadow-xs'
                : 'text-[#6B7280] hover:bg-slate-200'
            }`}
          >
            📋 Incident Triage
          </button>
          <button
            onClick={() => setActiveTab('ndrf')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'ndrf'
                ? 'bg-[#0F4C81] text-white shadow-xs'
                : 'text-[#6B7280] hover:bg-slate-200'
            }`}
          >
            🚜 NDRF Matrix
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
        </div>
      </div>
    </div>
  );
};
