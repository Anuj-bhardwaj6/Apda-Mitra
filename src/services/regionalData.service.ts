import fs from "fs";
import path from "path";
import {
  TARGET_STATES,
  TARGET_REGION_BBOX,
  TARGET_REGION_CENTER,
  getTargetStateBySlug,
  TargetState,
} from "@/constants/targetRegion";

export interface VerifiedCoolrRecord {
  id: string;
  event_title: string;
  event_date: string;
  state: string;
  latitude: number;
  longitude: number;
  trigger: string;
  category: string;
  location_description: string;
  source: string;
  source_catalog: string;
  source_event_id: string;
}

let cachedVerifiedRecords: VerifiedCoolrRecord[] | null = null;

export function loadVerifiedCoolrRecords(): VerifiedCoolrRecord[] {
  if (cachedVerifiedRecords) return cachedVerifiedRecords;

  const records: VerifiedCoolrRecord[] = [];
  try {
    const csvPath = path.resolve(process.cwd(), "Apda_Mitra_Verified_Landslide_Inventory_v2.csv");
    if (fs.existsSync(csvPath)) {
      const content = fs.readFileSync(csvPath, "utf-8");
      const lines = content.split("\n");
      // Header: event_id,event_date,event_title,location_description,state,latitude,longitude,landslide_category,landslide_trigger,...
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV parse accounting for quoted fields
        const regex = /(?:^|,)("(?:[^"]|"")*"|[^,]*)/g;
        const matches: string[] = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
          let field = match[1] ?? "";
          if (field.startsWith('"') && field.endsWith('"')) {
            field = field.slice(1, -1).replace(/""/g, '"');
          }
          matches.push(field);
          if (regex.lastIndex === match.index) {
            regex.lastIndex++;
          }
        }

        const eventId = matches[0] || `inv-${i}`;
        const eventDate = matches[1] || "";
        const title = matches[2] || "Verified Landslide Incident";
        const locDesc = matches[3] || "";
        const state = matches[4] || "";
        const lat = parseFloat(matches[5] || "0");
        const lon = parseFloat(matches[6] || "0");
        const category = matches[7] || "Landslide";
        const trigger = matches[8] || "Heavy Rainfall";
        const catalog = matches[15] || "Global Landslide Catalog (GLC)";

        if (lat !== 0 && lon !== 0) {
          records.push({
            id: `coolr-${eventId}`,
            event_title: title,
            event_date: eventDate,
            state: state.trim(),
            latitude: lat,
            longitude: lon,
            trigger,
            category,
            location_description: locDesc,
            source: "NASA COOLR",
            source_catalog: catalog,
            source_event_id: String(eventId),
          });
        }
      }
    }
  } catch (err) {
    console.warn("Failed reading verified landslide inventory CSV", err);
  }

  cachedVerifiedRecords = records;
  return records;
}

export function getRegionalCoolrEvents(limit: number = 100): VerifiedCoolrRecord[] {
  const records = loadVerifiedCoolrRecords();
  return records.slice(0, limit);
}

export function getStateCoolrEvents(stateNameOrSlug: string, limit: number = 50): VerifiedCoolrRecord[] {
  const st = getTargetStateBySlug(stateNameOrSlug);
  const records = loadVerifiedCoolrRecords();
  if (!st) return [];

  const filtered = records.filter(
    (r) => r.state.toLowerCase() === st.name.toLowerCase()
  );
  if (filtered.length > 0) {
    return filtered.slice(0, limit);
  }

  // Fallback to bounding box check
  const bboxFiltered = records.filter(
    (r) =>
      r.latitude >= st.bbox.minLat &&
      r.latitude <= st.bbox.maxLat &&
      r.longitude >= st.bbox.minLon &&
      r.longitude <= st.bbox.maxLon
  );
  return bboxFiltered.slice(0, limit);
}
