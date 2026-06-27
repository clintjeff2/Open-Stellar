import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

const originalCwd = process.cwd()
let tempDir: string | null = null

async function loadStateModule() {
  vi.resetModules()
  return import("@/lib/agent-runtime/state")
}

afterEach(() => {
  process.chdir(originalCwd)
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true })
    tempDir = null
  }
})

describe("agent runtime state", () => {
  it("hydrates default agents from the file-backed persistent store", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "open-stellar-agent-state-"))
    process.chdir(tempDir)
    const { seedPersistentAgentState, listPersistedAgents, listLiveAgentPositions } = await loadStateModule()

    seedPersistentAgentState()

    const agents = listPersistedAgents()
    const positions = listLiveAgentPositions()

    expect(agents.length).toBeGreaterThan(0)
    expect(positions).toHaveLength(agents.length)
    expect(positions[0]).toHaveProperty("agentId")
  })

  it("persists live positions independently of DB-backed agent config", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "open-stellar-agent-state-"))
    process.chdir(tempDir)
    const { seedPersistentAgentState, listPersistedAgents, writeLiveAgentPositions } = await loadStateModule()

    seedPersistentAgentState()
    const [agent] = listPersistedAgents()

    writeLiveAgentPositions([{ agentId: agent.id, pixelX: 11, pixelY: 22, targetX: 33, targetY: 44, direction: "left" }])

    const updated = listPersistedAgents().find((candidate) => candidate.id === agent.id)
    expect(updated?.name).toBe(agent.name)
    expect(updated?.pixelX).toBe(11)
    expect(updated?.pixelY).toBe(22)
    expect(updated?.targetX).toBe(33)
    expect(updated?.targetY).toBe(44)
    expect(updated?.direction).toBe("left")
  })
})
