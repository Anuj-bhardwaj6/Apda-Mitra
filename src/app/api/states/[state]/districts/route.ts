import { NextRequest, NextResponse } from "next/server";
import { getTargetStateBySlug } from "@/constants/targetRegion";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ state: string }> }
) {
  const { state } = await context.params;
  const st = getTargetStateBySlug(state);
  if (!st) {
    return NextResponse.json(
      { error: `State '${state}' not found in target region.` },
      { status: 404 }
    );
  }
  return NextResponse.json({
    state: st.name,
    state_id: st.id,
    count: st.districts.length,
    districts: st.districts,
  });
}
