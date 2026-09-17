import { NextResponse } from "next/server";
import { TARGET_STATES } from "@/constants/targetRegion";

export async function GET() {
  return NextResponse.json({
    region: "APDA MITRA TARGET REGION",
    count: TARGET_STATES.length,
    states: TARGET_STATES,
  });
}
