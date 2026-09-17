import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/risk/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
  } catch {
    // backend offline
  }

  return NextResponse.json({
    status: "model_unavailable",
    risk_probability: null,
    risk_level: "MODEL NOT AVAILABLE",
    message: "APDA MITRA AI: MODEL NOT AVAILABLE",
  });
}
