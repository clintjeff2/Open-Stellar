import { writeLiveAgentPositions } from "@/lib/agent-runtime/state"
import type { MoltbotAgent } from "@/lib/types"

export function syncPositions(agents: MoltbotAgent[]): void {
  writeLiveAgentPositions(agents.map((agent) => ({
    agentId: agent.id,
    pixelX: agent.pixelX,
    pixelY: agent.pixelY,
    targetX: agent.targetX,
    targetY: agent.targetY,
    direction: agent.direction,
  })))
}
