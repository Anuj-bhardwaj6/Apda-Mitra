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
  disaster: <Flame className="w-3.5 h-3.5 text-red-500 shrink-0" />,
  infrastructure: <Building2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />,
  geographic: <Compass className="w-3.5 h-3.5 text-sky-500 shrink-0" />,
};

const CATEGORY_NAMES: Record<GisLayerCategory, { en: string; hi: string }> = {
  disaster: { en: 'Disaster Risk', hi: 'आपदा एवं जोखिम' },
  infrastructure: { en: 'Infrastructure', hi: 'बुनियादी ढांचा' },
  geographic: { en: 'Geographic', hi: 'भौगोलिक विशेषताएं' },
};

const LAYER_ICONS: Record<string, React.ReactNode> = {
  flood: <Waves className="w-3.5 h-3.5 text-blue-500" />,
  landslide: <Mountain className="w-3.5 h-3.5 text-amber-600" />,
  rainfall: <CloudRain className="w-3.5 h-3.5 text-cyan-500" />,
  hazard_zones: <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />,
  roads: <Route className="w-3.5 h-3.5 text-emerald-600" />,
  shelters: <Home className="w-3.5 h-3.5 text-teal-600" />,
  hospitals: <Hospital className="w-3.5 h-3.5 text-red-600" />,
  facilities: <Building2 className="w-3.5 h-3.5 text-indigo-600" />,
  admin_boundaries: <MapPin className="w-3.5 h-3.5 text-slate-500" />,
  rivers: <Waves className="w-3.5 h-3.5 text-sky-500" />,
  elevation: <Mountain className="w-3.5 h-3.5 text-lime-600" />,
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
  // Mobile accordion state: default disaster expanded, others collapsed for compact viewing
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    infrastructure: true,
    geographic: true,
  });
  const [showLegend, setShowLegend] = useState<boolean>(false);

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
  const activeLegendLayers = GIS_LAYERS.filter((l) => activeGisLayers[l.id] && l.legend && l.legend.length > 0);

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-auto sm:top-14 sm:right-3 sm:left-auto sm:w-[350px] z-[450] max-h-[min(calc(100%-140px),calc(100dvh-180px))] flex flex-col bg-white/95 dark:bg-[#131D2A]/95 backdrop-blur-xl border border-gray-200/90 dark:border-gray-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 sm:slide-in-from-top-2 duration-200"
    >
      {/* 1. Sticky Header with Clear Controls */}
      <div className="sticky top-0 z-20 px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white/95 dark:bg-[#131D2A]/95 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center space-x-1.5">
            <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white leading-none">
              {lang === 'hi' ? 'जीआईएस मैप लेयर्स' : 'GIS Map Layers'}
            </h3>
            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              {activeCount}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onResetDefaults}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title={lang === 'hi' ? 'डिफ़ॉल्ट रीसेट करें' : 'Reset to defaults'}
            aria-label="Reset to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Close layers panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Layer List (Independent Inner Scroll) */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5 text-xs overscroll-contain no-scrollbar">
        {/* Base Maps: Compact 3-Column Grid */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-gray-400 dark:text-gray-500">
              {lang === 'hi' ? 'बेस मैप' : 'Base Cartography'}
            </span>
            <span className="text-[9px] text-gray-400 font-medium">
              {lang === 'hi' ? 'एक चुनें' : 'Select 1'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(Object.values(BASE_MAPS) as any[]).map((base) => {
              const isSelected = activeBaseMap === base.id;
              return (
                <button
                  key={base.id}
                  onClick={() => onSelectBaseMap(base.id as BaseMapId)}
                  className={`py-1.5 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-0.5 relative min-h-[48px] ${
                    isSelected
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                      : 'border-gray-200 dark:border-gray-700/70 hover:border-gray-300 dark:hover:border-gray-600 bg-white/70 dark:bg-[#182333]/70 text-gray-700 dark:text-gray-300 font-medium'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-2 h-2" />
                    </div>
                  )}
                  <div
                    className="w-5 h-5 rounded-md shadow-xs flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: base.previewColor }}
                  >
                    <Layers className="w-2.5 h-2.5" />
                  </div>
                  <span className="text-[10px] leading-tight truncate w-full px-1">
                    {lang === 'hi' ? base.nameHi : base.name.replace(' (ESRI)', '').replace(' / Topo', '')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories: Accordions with ~60px High Layer Cards */}
        {(['disaster', 'infrastructure', 'geographic'] as GisLayerCategory[]).map((catKey) => {
          const layers = categorizedLayers[catKey];
          const isCollapsed = collapsedCategories[catKey] || false;
          const activeInCat = layers.filter((l) => activeGisLayers[l.id]).length;

          return (
            <div key={catKey} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCategory(catKey)}
                className="w-full px-2.5 py-1.5 bg-gray-50/80 dark:bg-[#182333]/80 hover:bg-gray-100/80 dark:hover:bg-[#1A2638] flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-1.5">
                  {CATEGORY_ICONS[catKey]}
                  <span className="font-bold text-gray-800 dark:text-gray-200 text-[11px]">
                    {lang === 'hi' ? CATEGORY_NAMES[catKey].hi : CATEGORY_NAMES[catKey].en}
                  </span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {activeInCat}/{layers.length}
                  </span>
                </div>
                {isCollapsed ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronUp className="w-3 h-3 text-gray-400" />}
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-gray-100 dark:divide-gray-800/60 p-0.5 bg-white/50 dark:bg-[#131D2A]/50">
                  {layers.map((layer) => {
                    const isActive = !!activeGisLayers[layer.id];
                    return (
                      <div
                        key={layer.id}
                        onClick={() => onToggleGisLayer(layer.id)}
                        className={`min-h-[58px] p-2 rounded-lg transition-all cursor-pointer flex items-center justify-between space-x-2 select-none active:scale-98 ${
                          isActive
                            ? 'bg-blue-50/50 dark:bg-blue-950/25'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center shrink-0">
                            {LAYER_ICONS[layer.id] || <Layers className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-gray-900 dark:text-gray-100 text-[11px] truncate">
                                {lang === 'hi' ? layer.nameHi : layer.name}
                              </span>
                              <div
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: layer.color }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {lang === 'hi' ? layer.descriptionHi || layer.description : layer.description}
                            </p>
                          </div>
                        </div>

                        {/* Mobile-Friendly Toggle Switch */}
                        <div
                          className={`w-8 h-4.5 rounded-full transition-colors relative shrink-0 ${
                            isActive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform absolute top-0.5 left-0.5 ${
                              isActive ? 'translate-x-3.5' : 'translate-x-0'
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

        {/* Active Map Legend Accordion */}
        <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="w-full px-2.5 py-1.5 bg-gray-50/80 dark:bg-[#182333]/80 hover:bg-gray-100/80 dark:hover:bg-[#1A2638] flex items-center justify-between text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="font-bold text-gray-800 dark:text-gray-200 text-[11px]">
                {lang === 'hi' ? 'मानचित्र संकेत (Legend)' : 'Active Legend'}
              </span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {activeLegendLayers.length}
              </span>
            </div>
            {showLegend ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronUp className="w-3 h-3 text-gray-400" />}
          </button>

          {showLegend && (
            <div className="p-2 space-y-2 bg-white dark:bg-[#131D2A] divide-y divide-gray-100 dark:divide-gray-800/60">
              {activeLegendLayers.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic text-center py-1">
                  {lang === 'hi' ? 'कोई लेयर सक्रिय नहीं है' : 'No active layers with legends'}
                </p>
              ) : (
                activeLegendLayers.map((layer) => (
                  <div key={layer.id} className="pt-1.5 first:pt-0 space-y-1">
                    <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
                      {lang === 'hi' ? layer.nameHi : layer.name}
                    </span>
                    <div className="grid grid-cols-1 gap-1">
                      {layer.legend.map((item, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-[10px] text-gray-700 dark:text-gray-300">
                          {item.type === 'fill' && (
                            <div
                              className="w-3 h-2.5 rounded-xs shrink-0 border"
                              style={{
                                backgroundColor: item.color,
                                borderColor: item.border || item.color,
                                opacity: 0.75,
                              }}
                            />
                          )}
                          {item.type === 'line' && (
                            <div
                              className="w-3 h-0.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                          )}
                          {item.type === 'marker' && (
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-white"
                              style={{ backgroundColor: item.color }}
                            />
                          )}
                          <span className="leading-tight truncate">
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
    </div>
  );
};

export default GisLayersPanel;
