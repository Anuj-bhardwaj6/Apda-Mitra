'use client';

import React, { useState } from 'react';
import {
  Layers,
  X,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Flame,
  Waves,
  Mountain,
  CloudRain,
  ShieldAlert,
  Route,
  Home,
  Hospital,
  Building2,
  MapPin,
  Compass,
  Info,
  SlidersHorizontal,
} from 'lucide-react';
import { BaseMapId, GisLayerCategory, GisLayerConfig, GisLayerId } from '@/lib/gis/types';
import { BASE_MAPS, GIS_LAYERS } from '@/lib/gis/constants';

interface GisLayersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeBaseMap: BaseMapId;
  onSelectBaseMap: (id: BaseMapId) => void;
  activeGisLayers: Record<string, boolean>;
  onToggleGisLayer: (id: GisLayerId) => void;
  onResetDefaults: () => void;
  lang?: 'en' | 'hi';
}

const CATEGORY_ICONS: Record<GisLayerCategory, React.ReactNode> = {
  disaster: <Flame className="w-4 h-4 text-red-500" />,
  infrastructure: <Building2 className="w-4 h-4 text-emerald-500" />,
  geographic: <Compass className="w-4 h-4 text-sky-500" />,
};

const CATEGORY_NAMES: Record<GisLayerCategory, { en: string; hi: string }> = {
  disaster: { en: 'Disaster & Hazard Risk', hi: 'आपदा एवं जोखिम परतें' },
  infrastructure: { en: 'Emergency Infrastructure', hi: 'आपातकालीन बुनियादी ढांचा' },
  geographic: { en: 'Geographical Features', hi: 'भौगोलिक एवं भू-आकृतिक' },
};

const LAYER_ICONS: Record<string, React.ReactNode> = {
  flood: <Waves className="w-4 h-4 text-blue-500" />,
  landslide: <Mountain className="w-4 h-4 text-amber-600" />,
  rainfall: <CloudRain className="w-4 h-4 text-cyan-500" />,
  hazard_zones: <ShieldAlert className="w-4 h-4 text-rose-500" />,
  roads: <Route className="w-4 h-4 text-emerald-600" />,
  shelters: <Home className="w-4 h-4 text-teal-600" />,
  hospitals: <Hospital className="w-4 h-4 text-red-600" />,
  facilities: <Building2 className="w-4 h-4 text-indigo-600" />,
  admin_boundaries: <MapPin className="w-4 h-4 text-slate-500" />,
  rivers: <Waves className="w-4 h-4 text-sky-500" />,
  elevation: <Mountain className="w-4 h-4 text-lime-600" />,
};

export const GisLayersPanel: React.FC<GisLayersPanelProps> = ({
  isOpen,
  onClose,
  activeBaseMap,
  onSelectBaseMap,
  activeGisLayers,
  onToggleGisLayer,
  onResetDefaults,
  lang = 'en',
}) => {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [showLegend, setShowLegend] = useState<boolean>(true);

  if (!isOpen) return null;

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Group GIS layers by category
  const categorizedLayers: Record<GisLayerCategory, GisLayerConfig[]> = {
    disaster: GIS_LAYERS.filter((l) => l.category === 'disaster'),
    infrastructure: GIS_LAYERS.filter((l) => l.category === 'infrastructure'),
    geographic: GIS_LAYERS.filter((l) => l.category === 'geographic'),
  };

  const activeCount = Object.values(activeGisLayers).filter(Boolean).length;

  // Collect active legends
  const activeLegendLayers = GIS_LAYERS.filter((l) => activeGisLayers[l.id] && l.legend && l.legend.length > 0);

  return (
    <div className="absolute top-14 right-3 z-[600] w-[330px] sm:w-[380px] max-w-[calc(100vw-24px)] max-h-[calc(100%-70px)] flex flex-col bg-white/95 dark:bg-[#131D2A]/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-[#182333]/50">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
                {lang === 'hi' ? 'जीआईएस मैप लेयर्स' : 'GIS Map Layers'}
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                {activeCount} {lang === 'hi' ? 'सक्रिय' : 'active'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
              {lang === 'hi' ? 'मानचित्र बेस एवं आपदा विश्लेषण परतें' : 'Disaster overlays & base cartography'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onResetDefaults}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={lang === 'hi' ? 'डिफ़ॉल्ट रीसेट करें' : 'Reset to defaults'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close layers panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs">
        {/* 1. Base Maps Section (Mutually Exclusive) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-gray-400 dark:text-gray-500">
              {lang === 'hi' ? 'बेस मैप्स (Base Maps)' : 'Base Cartography'}
            </span>
            <span className="text-[10px] text-gray-400">
              {lang === 'hi' ? 'परस्पर अनन्य' : 'Single Select'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(Object.values(BASE_MAPS) as any[]).map((base) => {
              const isSelected = activeBaseMap === base.id;
              return (
                <button
                  key={base.id}
                  onClick={() => onSelectBaseMap(base.id as BaseMapId)}
                  className={`p-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 relative ${
                    isSelected
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                      : 'border-gray-200 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 bg-white/60 dark:bg-[#182333]/60 text-gray-700 dark:text-gray-300 font-medium'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                  <div
                    className="w-7 h-7 rounded-xl shadow-xs flex items-center justify-center text-white"
                    style={{ backgroundColor: base.previewColor }}
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] leading-tight line-clamp-1">
                    {lang === 'hi' ? base.nameHi : base.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Overlays by Category */}
        {(['disaster', 'infrastructure', 'geographic'] as GisLayerCategory[]).map((catKey) => {
          const layers = categorizedLayers[catKey];
          const isCollapsed = collapsedCategories[catKey] || false;
          const activeInCat = layers.filter((l) => activeGisLayers[l.id]).length;

          return (
            <div key={catKey} className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleCategory(catKey)}
                className="w-full px-3 py-2 bg-gray-50/70 dark:bg-[#182333]/70 hover:bg-gray-100/70 dark:hover:bg-[#1A2638] flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  {CATEGORY_ICONS[catKey]}
                  <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                    {lang === 'hi' ? CATEGORY_NAMES[catKey].hi : CATEGORY_NAMES[catKey].en}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {activeInCat}/{layers.length}
                  </span>
                </div>
                {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-400" />}
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-gray-100 dark:divide-gray-800/60 p-1 bg-white/40 dark:bg-[#131D2A]/40">
                  {layers.map((layer) => {
                    const isActive = !!activeGisLayers[layer.id];
                    return (
                      <div
                        key={layer.id}
                        onClick={() => onToggleGisLayer(layer.id)}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-start justify-between space-x-2 select-none ${
                          isActive
                            ? 'bg-blue-50/40 dark:bg-blue-950/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                        }`}
                      >
                        <div className="flex items-start space-x-2.5">
                          <div className="p-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0 mt-0.5">
                            {LAYER_ICONS[layer.id] || <Layers className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                                {lang === 'hi' ? layer.nameHi : layer.name}
                              </span>
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: layer.color }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                              {lang === 'hi' ? layer.descriptionHi || layer.description : layer.description}
                            </p>
                          </div>
                        </div>

                        {/* Modern Toggle Switch */}
                        <div
                          className={`w-9 h-5 rounded-full transition-colors relative shrink-0 mt-0.5 ${
                            isActive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform absolute top-0.5 left-0.5 ${
                              isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* 3. Active Layers Dynamic Legend */}
        <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="w-full px-3 py-2 bg-gray-50/70 dark:bg-[#182333]/70 hover:bg-gray-100/70 dark:hover:bg-[#1A2638] flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-500" />
              <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                {lang === 'hi' ? 'सक्रिय मानचित्र लीजेंड (Legend)' : 'Active Map Legend'}
              </span>
              <span className="text-[10px] text-gray-400">
                ({activeLegendLayers.length})
              </span>
            </div>
            {showLegend ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-400" />}
          </button>

          {showLegend && (
            <div className="p-3 space-y-3 bg-white dark:bg-[#131D2A]">
              {activeLegendLayers.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic text-center py-2">
                  {lang === 'hi' ? 'कोई लेयर सक्रिय नहीं है' : 'No active layers with legends'}
                </p>
              ) : (
                activeLegendLayers.map((layer) => (
                  <div key={layer.id} className="space-y-1.5 pb-2 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                    <span className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                      {lang === 'hi' ? layer.nameHi : layer.name}
                    </span>
                    <div className="space-y-1">
                      {layer.legend.map((item, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-[11px] text-gray-700 dark:text-gray-300">
                          {item.type === 'fill' && (
                            <div
                              className="w-3.5 h-3 rounded-xs shrink-0 border"
                              style={{
                                backgroundColor: item.color,
                                borderColor: item.border || item.color,
                                opacity: 0.75,
                              }}
                            />
                          )}
                          {item.type === 'line' && (
                            <div
                              className="w-3.5 h-0.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                          )}
                          {item.type === 'marker' && (
                            <div
                              className="w-3 h-3 rounded-full shrink-0 border border-white"
                              style={{ backgroundColor: item.color }}
                            />
                          )}
                          <span className="leading-tight">
                            {lang === 'hi' ? item.labelHi || item.label : item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer info note */}
      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#182333]/50 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center space-x-1">
          <Info className="w-3 h-3 text-blue-500" />
          <span>Apda-Mitra Spatial Engine v2.5</span>
        </span>
        <span className="font-semibold text-gray-400">GeoJSON & Vector Ready</span>
      </div>
    </div>
  );
};

export default GisLayersPanel;
