import { NextResponse } from "next/server"
import { createSystemEventResponse } from "@/lib/events/event-stream"
import { listRegisteredAgents, registerAgent } from "@/lib/agent-registry"
import { listPersistedAgents, seedPersistentAgentState } from "@/lib/agent-runtime/state"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)

  if (url.searchParams.get("stream") === "1") {
    return createSystemEventResponse()
  }

  const filters = {
    district: url.searchParams.get("district") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    skill: url.searchParams.get("skill") ?? undefined,
  }
  const capabilityAgents = listRegisteredAgents(filters)

  seedPersistentAgentState()
  const persistedAgents = listPersistedAgents().filter((agent) => {
    if (filters.district && agent.district !== filters.district) return false
    if (filters.status && agent.status !== filters.status) return false
    if (filters.skill && !agent.skills.some((candidate) => candidate.id === filters.skill || candidate.name === filters.skill)) return false
    return true
  })

  return NextResponse.json(
    { ok: true, agents: url.searchParams.get("state") === "1" || capabilityAgents.length === 0 ? persistedAgents : capabilityAgents, persistedAgents, capabilityAgents },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function POST(req: Request) {
  try {
    const agent = registerAgent(await req.json())
    return NextResponse.json(
      { ok: true, agent },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed registering agent" },
      { status: 400 },
    )
  }
}
