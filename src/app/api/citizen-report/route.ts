import { NextResponse } from "next/server";
import { CitizenReportPayload, DisasterIncident } from "@/types/disaster";

// In-memory storage for citizen reports during server lifecycle
interface StoredCitizenReport extends CitizenReportPayload {
  incidentRef: string;
  timestamp: string;
  status: "PENDING_VERIFICATION" | "VERIFIED" | "DISPATCHED";
}

const citizenReportsStore: StoredCitizenReport[] = [
  {
    incidentRef: "CIT-01-WATERLOG",
    category: "URBAN_WATERLOGGING",
    urgency: "URGENT_ASSISTANCE",
    landmark: "Village Bada Gopalpur, coastal dyke zone",
    contactNumber: "+91 94371 99881",
    description: "River embankment seeped; water entering residential sector. 4 senior citizens need boat evacuation.",
    latitude: 21.431,
    longitude: 87.042,
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: "VERIFIED",
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    count: citizenReportsStore.length,
    reports: citizenReportsStore,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CitizenReportPayload;

    if (!body.category || !body.latitude || !body.longitude) {
      return NextResponse.json(
        { success: false, error: "Missing required coordinates or disaster category" },
        { status: 400 }
      );
    }

    // Try forwarding to FastAPI backend
    let backendRef: string | null = null;
    try {
      const fastApiRes = await fetch("http://127.0.0.1:8000/api/v1/reports/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: body.category,
          urgency: body.urgency || "URGENT_ASSISTANCE",
          landmark: body.landmark || "GPS Location",
          contact_number: body.contactNumber || "112",
          description: body.description || "Citizen emergency report",
          latitude: body.latitude,
          longitude: body.longitude,
          photo_url: body.photoUrl || null,
        }),
      });
      if (fastApiRes.ok) {
        const json = await fastApiRes.json();
        if (json.success && json.data) {
          backendRef = json.data.incident_ref;
        }
      }
    } catch (backendErr) {
      console.warn("[API/CitizenReport] FastAPI backend submission failed, using local store", backendErr);
    }

    const incidentRef = backendRef || `CIT-${Date.now().toString(36).toUpperCase()}`;
    const newReport: StoredCitizenReport = {
      ...body,
      incidentRef,
      timestamp: new Date().toISOString(),
      status: "PENDING_VERIFICATION",
    };

    // Prepend to local list
    citizenReportsStore.unshift(newReport);

    console.info(`[API/CitizenReport] Emergency report received: ${incidentRef}`);

    return NextResponse.json({
      success: true,
      incidentRef,
      message: "Emergency incident report logged with Central Disaster Dispatch.",
      report: newReport,
      source: backendRef ? "FastAPI Backend" : "Local Store",
    });
  } catch (err: any) {
    console.error("[API/CitizenReport] Error processing report", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

