import { NextResponse } from "next/server"
import { listLiveAgentPositions } from "@/lib/agent-runtime/state"
import { syncPositions } from "@/lib/agent-runtime/position-sync"
import type { MoltbotAgent } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json(
    { ok: true, positions: listLiveAgentPositions() },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { agents?: MoltbotAgent[] }
    if (!Array.isArray(body.agents)) {
      return NextResponse.json({ ok: false, error: "agents must be an array" }, { status: 400 })
    }

    syncPositions(body.agents)
    return NextResponse.json(
      { ok: true, count: body.agents.length },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed syncing positions" },
      { status: 400 },
    )
  }
}
