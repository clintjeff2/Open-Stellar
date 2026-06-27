import type { Metadata } from "next"
import { AdminConsole } from "@/components/admin/admin-console"
import { DISTRICTS, createAgents } from "@/lib/data"
import { listRegisteredAgents } from "@/lib/agent-registry"
import { listTasks } from "@/lib/agent-runtime/task-queue"
import { listOrchestrationRuns } from "@/lib/orchestration/runs"

export const metadata: Metadata = {
  title: "Open Stellar Admin",
  description: "Admin portal for agent orchestration, API key issuance, and x402 subscription billing.",
}

export default function AdminPage() {
  const simulatedAgents = createAgents()
  const registeredAgents = listRegisteredAgents()
  const agents = simulatedAgents.map((agent) => {
    const registered = registeredAgents.find((runtimeAgent) => runtimeAgent.agentId === agent.id)
    return registered ? { ...agent, model: registered.model, district: registered.district, status: registered.status } : agent
  })
  const { runs } = listOrchestrationRuns()

  return (
    <AdminConsole
      agents={agents}
      districts={DISTRICTS}
      initialRuns={runs}
      initialTasks={listTasks({ includeDeadLetter: true })}
    />
  )
}
