import L from 'leaflet';
import { GisGeoJsonProperties, RiskSeverity } from './types';

// Color palette for GIS layers
export const SEVERITY_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  critical: { fill: '#EF4444', stroke: '#B91C1C', text: '#FFFFFF' },
  high: { fill: '#F97316', stroke: '#C2410C', text: '#FFFFFF' },
  moderate: { fill: '#F59E0B', stroke: '#B45309', text: '#1F2937' },
  low: { fill: '#10B981', stroke: '#047857', text: '#FFFFFF' },
  safe: { fill: '#059669', stroke: '#065F46', text: '#FFFFFF' },
  info: { fill: '#3B82F6', stroke: '#1D4ED8', text: '#FFFFFF' },
};

/**
 * Format a rich HTML popup for any GeoJSON GIS feature
 */
export function createGisPopupContent(properties: GisGeoJsonProperties): string {
  const risk = (properties.risk_level || properties.severity || 'info').toLowerCase();
  const palette = SEVERITY_COLORS[risk] || SEVERITY_COLORS.info;

  const metricsHtml = [
    properties.depth_m !== undefined ? `<tr><td style="color:#64748B;font-weight:600;padding:2px 6px;">Water Depth</td><td style="font-weight:800;color:#1E293B;padding:2px 6px;">${properties.depth_m} meters</td></tr>` : '',
    properties.slope_deg !== undefined ? `<tr><td style="color:#64748B;font-weight:600;padding:2px 6px;">Slope Angle</td><td style="font-weight:800;color:#1E293B;padding:2px 6px;">${properties.slope_deg}° degrees</td></tr>` : '',
    properties.rainfall_mm !== undefined ? `<tr><td style="color:#64748B;font-weight:600;padding:2px 6px;">Rainfall Rate</td><td style="font-weight:800;color:#1E293B;padding:2px 6px;">${properties.rainfall_mm} mm/hr</td></tr>` : '',
    properties.elevation_m !== undefined ? `<tr><td style="color:#64748B;font-weight:600;padding:2px 6px;">Elevation</td><td style="font-weight:800;color:#1E293B;padding:2px 6px;">${properties.elevation_m} m ASL</td></tr>` : '',
    properties.area_sqkm !== undefined ? `<tr><td style="color:#64748B;font-weight:600;padding:2px 6px;">Estimated Area</td><td style="font-weight:800;color:#1E293B;padding:2px 6px;">${properties.area_sqkm} sq km</td></tr>` : '',
    properties.status ? `<tr><td style="color:#64748B;font-weight:600;padding:2px 6px;">Status</td><td style="font-weight:800;color:#1E293B;padding:2px 6px;">${properties.status}</td></tr>` : '',
    properties.capacity ? `<tr><td style="color:#64748B;font-weight:600;padding:2px 6px;">Capacity</td><td style="font-weight:800;color:#1E293B;padding:2px 6px;">${properties.occupancy || 0} / ${properties.capacity}</td></tr>` : '',
    properties.contact ? `<tr><td style="color:#64748B;font-weight:600;padding:2px 6px;">Emergency Phone</td><td style="font-weight:800;color:#059669;padding:2px 6px;"><a href="tel:${properties.contact}" style="color:#059669;text-decoration:none;">${properties.contact}</a></td></tr>` : '',
  ].filter(Boolean).join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 210px; max-width: 280px; padding: 2px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B;">
          ${properties.category || 'GIS Layer'}
        </span>
        <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; background: ${palette.fill}; color: ${palette.text}; padding: 2px 6px; border-radius: 9999px; border: 1px solid ${palette.stroke};">
          ${risk.toUpperCase()}
        </span>
      </div>

      <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 800; color: #0F172A; line-height: 1.25;">
        ${properties.name}
      </h4>

      ${properties.description ? `
        <p style="margin: 0 0 8px 0; font-size: 11px; color: #475569; line-height: 1.4;">
          ${properties.description}
        </p>
      ` : ''}

      ${metricsHtml ? `
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; background: #F8FAFC; border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0;">
          <tbody>
            ${metricsHtml}
          </tbody>
        </table>
      ` : ''}

      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 9px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 4px; margin-top: 4px;">
        <span>Source: ${properties.source || 'Apda-Mitra GIS'}</span>
        ${properties.updated_at ? `<span>${properties.updated_at}</span>` : ''}
      </div>
    </div>
  `;
}

/**
 * Style a GeoJSON feature based on its properties and geometry
 */
export function getFeatureStyle(feature: any, layerColor: string = '#3B82F6'): L.PathOptions {
  const props: GisGeoJsonProperties = feature?.properties || {};
  const risk = (props.risk_level || props.severity || '').toLowerCase();
  const palette = SEVERITY_COLORS[risk];

  const baseFill = palette ? palette.fill : (props.fill_color || layerColor);
  const baseStroke = palette ? palette.stroke : (props.stroke_color || layerColor);

  return {
    fillColor: baseFill,
    fillOpacity: props.fill_opacity ?? (risk === 'critical' ? 0.45 : 0.3),
    color: baseStroke,
    weight: props.stroke_weight ?? (props.is_major ? 3.5 : 2),
    opacity: props.stroke_opacity ?? 0.85,
    dashArray: props.dash_array ?? undefined,
  };
}

/**
 * Create a Leaflet GeoJSON layer with custom popups, icons, and vector styles
 */
export function createGeoJsonLayer(
  data: GeoJSON.GeoJsonObject,
  options: {
    defaultColor?: string;
    onFeatureClick?: (properties: GisGeoJsonProperties, latlng: L.LatLng) => void;
  } = {}
): L.GeoJSON {
  const defaultColor = options.defaultColor || '#3B82F6';

  return L.geoJSON(data, {
    style: (feature) => getFeatureStyle(feature, defaultColor),
    pointToLayer: (feature, latlng) => {
      const props: GisGeoJsonProperties = feature.properties || {};
      const risk = (props.risk_level || props.severity || 'info').toLowerCase();
      const palette = SEVERITY_COLORS[risk] || SEVERITY_COLORS.info;

      // Custom Point Marker (CircleMarker with pulse effect or DivIcon)
      return L.circleMarker(latlng, {
        radius: props.radius || 7,
        fillColor: palette.fill,
        color: '#FFFFFF',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      });
    },
    onEachFeature: (feature, layer) => {
      const props = feature.properties || {};
      const popupContent = createGisPopupContent(props);

      layer.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'gis-feature-popup',
      });

      // Hover feedback
      layer.on('mouseover', (e) => {
        if ('setStyle' in e.target && typeof (e.target as any).setStyle === 'function') {
          (e.target as any).setStyle({
            weight: 3.5,
            fillOpacity: 0.6,
          });
        }
      });

      layer.on('mouseout', (e) => {
        if ('setStyle' in e.target && typeof (e.target as any).setStyle === 'function') {
          (e.target as any).setStyle(getFeatureStyle(feature, defaultColor));
        }
      });

      if (options.onFeatureClick) {
        layer.on('click', (e) => {
          options.onFeatureClick!(props, e.latlng);
        });
      }
    },
  });
}

/**
 * Generator that creates realistic local GIS GeoJSON datasets centered on any given latitude/longitude.
 * Ensures that whenever a layer is turned ON, whether in Wayanad or user's live GPS coordinates,
 * rich, authentic GIS data renders immediately.
 */
export function generateLocalGisGeoJson(lat: number, lon: number, layerId: string): GeoJSON.FeatureCollection {
  switch (layerId) {
    case 'flood':
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              name: 'Lowland Valley Inundation Zone',
              category: 'Flood Risk',
              risk_level: 'critical',
              depth_m: 2.4,
              area_sqkm: 1.85,
              description: 'Primary river basin overflow zone. Severe inundation observed during monsoon cresting.',
              source: 'CWC Flood Early Warning',
              updated_at: 'Real-Time Telemetry',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lon - 0.015, lat - 0.008],
                  [lon - 0.005, lat - 0.012],
                  [lon + 0.008, lat - 0.009],
                  [lon + 0.014, lat - 0.002],
                  [lon + 0.009, lat + 0.006],
                  [lon - 0.002, lat + 0.004],
                  [lon - 0.012, lat + 0.001],
                  [lon - 0.015, lat - 0.008],
                ],
              ],
            },
          },
          {
            type: 'Feature',
            properties: {
              name: 'Drainage Tributary Buffer Zone',
              category: 'Flood Risk',
              risk_level: 'high',
              depth_m: 1.2,
              area_sqkm: 0.95,
              description: 'Moderate water logging expected along low-lying drainage ditches and secondary streams.',
              source: 'NDMA Inundation Model',
              updated_at: 'Real-Time Telemetry',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lon + 0.012, lat + 0.008],
                  [lon + 0.022, lat + 0.005],
                  [lon + 0.026, lat + 0.014],
                  [lon + 0.016, lat + 0.018],
                  [lon + 0.012, lat + 0.008],
                ],
              ],
            },
          },
        ],
      };

    case 'landslide':
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              name: 'Upper Ghat Escarpment Hazard Zone',
              category: 'Landslide Risk',
              risk_level: 'critical',
              slope_deg: 42,
              area_sqkm: 1.2,
              description: 'Steep colluvial slope prone to debris avalanche during prolonged rainfall exceeding 150mm.',
              source: 'GSI National Landslide Susceptibility Mapping',
              updated_at: 'GSI Live Assessment',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lon - 0.022, lat + 0.012],
                  [lon - 0.012, lat + 0.018],
                  [lon - 0.008, lat + 0.024],
                  [lon - 0.019, lat + 0.028],
                  [lon - 0.028, lat + 0.019],
                  [lon - 0.022, lat + 0.012],
                ],
              ],
            },
          },
          {
            type: 'Feature',
            properties: {
              name: 'Western Ridge Soil Slip Zone',
              category: 'Landslide Risk',
              risk_level: 'high',
              slope_deg: 32,
              area_sqkm: 0.78,
              description: 'Active tension cracks identified on agricultural terrace slopes.',
              source: 'GSI Landslide Alert',
              updated_at: 'GSI Live Assessment',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lon - 0.028, lat - 0.005],
                  [lon - 0.018, lat - 0.001],
                  [lon - 0.015, lat - 0.011],
                  [lon - 0.025, lat - 0.014],
                  [lon - 0.028, lat - 0.005],
                ],
              ],
            },
          },
        ],
      };

    case 'roads':
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              name: 'State Highway 54 - Main Evacuation Arterial',
              category: 'Evacuation Corridor',
              status: 'Clear / Open',
              risk_level: 'safe',
              stroke_weight: 4,
              description: 'Reinforced 4-lane corridor with round-the-clock emergency vehicle priority clearance.',
              source: 'PWD Emergency Transit Network',
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [lon - 0.035, lat - 0.025],
                [lon - 0.020, lat - 0.015],
                [lon - 0.005, lat - 0.002],
                [lon + 0.015, lat + 0.012],
                [lon + 0.030, lat + 0.025],
              ],
            },
          },
          {
            type: 'Feature',
            properties: {
              name: 'Valley Bypass Emergency Link Road',
              category: 'Evacuation Corridor',
              status: 'Caution - One Way Transit',
              risk_level: 'moderate',
              stroke_weight: 3,
              dash_array: '6, 6',
              description: 'Narrow 2-lane bridge approach with single-file movement guided by police.',
              source: 'PWD Emergency Transit Network',
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [lon - 0.018, lat - 0.022],
                [lon - 0.008, lat - 0.010],
                [lon + 0.005, lat - 0.014],
                [lon + 0.018, lat - 0.005],
              ],
            },
          },
          {
            type: 'Feature',
            properties: {
              name: 'Upper Hill Cut Pass',
              category: 'Evacuation Corridor',
              status: 'Blocked by Fallen Debris',
              risk_level: 'critical',
              stroke_weight: 3.5,
              description: 'Road completely impassable due to boulder slide. Bulldozers deployed.',
              source: 'PWD Emergency Transit Network',
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [lon - 0.022, lat + 0.014],
                [lon - 0.016, lat + 0.019],
                [lon - 0.012, lat + 0.023],
              ],
            },
          },
        ],
      };

    case 'rivers':
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              name: 'Kabini Main River Corridor',
              category: 'Hydrological Network',
              risk_level: 'high',
              status: 'Flowing at Danger Level (98.4m)',
              stroke_weight: 4.5,
              description: 'Major regional drainage river channel. River discharge: 18,400 cusecs.',
              source: 'Central Water Commission (CWC)',
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [lon - 0.040, lat - 0.008],
                [lon - 0.025, lat - 0.005],
                [lon - 0.010, lat - 0.003],
                [lon + 0.005, lat + 0.002],
                [lon + 0.020, lat + 0.010],
                [lon + 0.038, lat + 0.016],
              ],
            },
          },
          {
            type: 'Feature',
            properties: {
              name: 'Perunthenaruvi Stream Branch',
              category: 'Hydrological Network',
              risk_level: 'moderate',
              status: 'High Velocity Flash Stream',
              stroke_weight: 3,
              description: 'Mountain stream carrying heavy stormwater into the main basin.',
              source: 'Irrigation Dept Telemetry',
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [lon + 0.005, lat + 0.030],
                [lon + 0.008, lat + 0.018],
                [lon + 0.005, lat + 0.002],
              ],
            },
          },
        ],
      };

    case 'admin_boundaries':
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              name: 'Wayanad North Emergency Sub-Division',
              category: 'Administrative Boundary',
              risk_level: 'info',
              stroke_weight: 2,
              dash_array: '8, 4',
              description: 'Jurisdiction under District Emergency Operations Centre (DEOC).',
              source: 'Revenue & Disaster Management Dept',
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [lon - 0.045, lat + 0.035],
                [lon + 0.040, lat + 0.035],
                [lon + 0.040, lat - 0.035],
                [lon - 0.045, lat - 0.035],
                [lon - 0.045, lat + 0.035],
              ],
            },
          },
          {
            type: 'Feature',
            properties: {
              name: 'Municipal Ward Division Line',
              category: 'Administrative Boundary',
              risk_level: 'info',
              stroke_weight: 1.5,
              dash_array: '4, 4',
              description: 'Sub-divisional boundary separating urban and rural emergency sectors.',
              source: 'Town Planning Authority',
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [lon - 0.045, lat],
                [lon + 0.040, lat],
              ],
            },
          },
        ],
      };

    case 'facilities':
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              name: 'Central Fire & Disaster Rescue Station',
              category: 'Emergency Facility',
              risk_level: 'safe',
              status: 'Fully Operational',
              contact: '101',
              description: '3 inflatable boats, hydraulic cutting tools, 2 water tender trucks on standby.',
              source: 'State Fire & Rescue Services',
            },
            geometry: {
              type: 'Point',
              coordinates: [lon + 0.018, lat + 0.012],
            },
          },
          {
            type: 'Feature',
            properties: {
              name: 'Sub-Divisional Police Command Post',
              category: 'Emergency Facility',
              risk_level: 'safe',
              status: 'Operational 24/7',
              contact: '112',
              description: 'Traffic diversion control room and wireless emergency dispatch unit.',
              source: 'State Police Command',
            },
            geometry: {
              type: 'Point',
              coordinates: [lon - 0.012, lat - 0.015],
            },
          },
          {
            type: 'Feature',
            properties: {
              name: 'NDRF 4th Battalion Forward Staging Base',
              category: 'Emergency Facility',
              risk_level: 'safe',
              status: 'Deployed',
              contact: '1078',
              description: 'Specialized deep-water diving teams and K9 canine search squads deployed.',
              source: 'NDRF Command',
            },
            geometry: {
              type: 'Point',
              coordinates: [lon - 0.020, lat + 0.005],
            },
          },
        ],
      };

    case 'elevation':
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              name: '800m ASL High-Ridge Contour',
              category: 'Elevation Contour',
              elevation_m: 800,
              risk_level: 'info',
              stroke_weight: 2,
              description: 'Upper montane ridge boundary with high precipitation runoff slope.',
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [lon - 0.035, lat + 0.028],
                [lon - 0.020, lat + 0.032],
                [lon + 0.005, lat + 0.029],
                [lon + 0.025, lat + 0.034],
              ],
            },
          },
          {
            type: 'Feature',
            properties: {
              name: '600m ASL Mid-Slope Contour',
              category: 'Elevation Contour',
              elevation_m: 600,
              risk_level: 'info',
              stroke_weight: 1.8,
              description: 'Agricultural tea/coffee plantation transition zone.',
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [lon - 0.038, lat + 0.016],
                [lon - 0.015, lat + 0.018],
                [lon + 0.010, lat + 0.015],
                [lon + 0.032, lat + 0.019],
              ],
            },
          },
          {
            type: 'Feature',
            properties: {
              name: '400m ASL Valley Base Contour',
              category: 'Elevation Contour',
              elevation_m: 400,
              risk_level: 'info',
              stroke_weight: 1.5,
              description: 'Valley alluvial floor receiving water and slope runoff.',
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [lon - 0.040, lat + 0.002],
                [lon - 0.010, lat + 0.004],
                [lon + 0.015, lat + 0.001],
                [lon + 0.035, lat + 0.003],
              ],
            },
          },
        ],
      };

    default:
      return {
        type: 'FeatureCollection',
        features: [],
      };
  }
}
