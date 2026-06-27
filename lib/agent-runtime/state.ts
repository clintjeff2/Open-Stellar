import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { createAgents } from "@/lib/data"
import type { AgentStatus, MoltbotAgent } from "@/lib/types"

export type PersistedAgentConfig = Pick<MoltbotAgent, "id" | "name" | "model" | "district" | "color" | "spriteId" | "appearance">
export type PersistedAgentStats = Pick<MoltbotAgent, "tasksCompleted" | "skills"> & Pick<Partial<MoltbotAgent>, "xp" | "level" | "xpToNext"> & {
  walletPublicKey: string | null
}
export type LiveAgentState = Pick<MoltbotAgent, "status" | "pixelX" | "pixelY" | "targetX" | "targetY" | "direction" | "currentTask" | "taskProgress"> & {
  walletBalance: string | null
  walletFunded: boolean | null
  updatedAt: string
}

interface AgentStateSnapshot {
  configs: PersistedAgentConfig[]
  stats: Record<string, PersistedAgentStats>
  live: Record<string, LiveAgentState>
}

const DATA_DIR = join(process.cwd(), ".data", "agent-runtime")
const DB_PATH = join(DATA_DIR, "agents-db.json")
const KV_PATH = join(DATA_DIR, "agents-kv.json")

function ensureDataDir(): void {
  mkdirSync(DATA_DIR, { recursive: true })
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T
  } catch {
    return fallback
  }
}

function writeJson(path: string, value: unknown): void {
  ensureDataDir()
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

function defaultSnapshot(): AgentStateSnapshot {
  const now = new Date().toISOString()
  const agents = createAgents()
  return {
    configs: agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      model: agent.model,
      district: agent.district,
      color: agent.color,
      spriteId: agent.spriteId,
      appearance: agent.appearance,
    })),
    stats: Object.fromEntries(agents.map((agent) => [agent.id, {
      tasksCompleted: agent.tasksCompleted,
      xp: agent.xp,
      level: agent.level,
      xpToNext: agent.xpToNext,
      skills: agent.skills,
      walletPublicKey: agent.wallet?.publicKey ?? null,
    }])),
    live: Object.fromEntries(agents.map((agent) => [agent.id, {
      status: agent.status,
      pixelX: agent.pixelX,
      pixelY: agent.pixelY,
      targetX: agent.targetX,
      targetY: agent.targetY,
      direction: agent.direction,
      currentTask: agent.currentTask,
      taskProgress: agent.taskProgress,
      walletBalance: agent.wallet?.balance ?? null,
      walletFunded: agent.wallet?.funded ?? null,
      updatedAt: now,
    }])),
  }
}

function readDb(): Pick<AgentStateSnapshot, "configs" | "stats"> {
  const defaults = defaultSnapshot()
  return readJson(DB_PATH, { configs: defaults.configs, stats: defaults.stats })
}

function readKv(): Pick<AgentStateSnapshot, "live"> {
  return readJson(KV_PATH, { live: defaultSnapshot().live })
}

function writeDb(db: Pick<AgentStateSnapshot, "configs" | "stats">): void {
  writeJson(DB_PATH, db)
}

function writeKv(kv: Pick<AgentStateSnapshot, "live">): void {
  writeJson(KV_PATH, kv)
}

export function listPersistedAgents(): MoltbotAgent[] {
  const { configs, stats } = readDb()
  const { live } = readKv()
  const defaultsById = new Map(createAgents().map((agent) => [agent.id, agent]))

  return configs.map((config) => {
    const fallback = defaultsById.get(config.id)
    const agentStats = stats[config.id]
    const agentLive = live[config.id]

    return {
      ...(fallback ?? createAgents()[0]),
      ...config,
      tasksCompleted: agentStats?.tasksCompleted ?? fallback?.tasksCompleted ?? 0,
      xp: agentStats?.xp ?? fallback?.xp ?? 0,
      level: agentStats?.level ?? fallback?.level ?? 1,
      xpToNext: agentStats?.xpToNext ?? fallback?.xpToNext ?? 100,
      skills: agentStats?.skills ?? fallback?.skills ?? [],
      wallet: agentStats?.walletPublicKey ? {
        publicKey: agentStats.walletPublicKey,
        balance: agentLive?.walletBalance ?? fallback?.wallet?.balance ?? "0",
        funded: agentLive?.walletFunded ?? fallback?.wallet?.funded ?? false,
      } : fallback?.wallet,
      status: agentLive?.status ?? fallback?.status ?? "idle",
      pixelX: agentLive?.pixelX ?? fallback?.pixelX ?? 0,
      pixelY: agentLive?.pixelY ?? fallback?.pixelY ?? 0,
      targetX: agentLive?.targetX ?? fallback?.targetX ?? 0,
      targetY: agentLive?.targetY ?? fallback?.targetY ?? 0,
      direction: agentLive?.direction ?? fallback?.direction ?? "right",
      currentTask: agentLive?.currentTask ?? fallback?.currentTask ?? null,
      taskProgress: agentLive?.taskProgress ?? fallback?.taskProgress ?? 0,
    }
  })
}

export function listLiveAgentPositions(): Array<Pick<LiveAgentState, "pixelX" | "pixelY" | "targetX" | "targetY" | "direction" | "updatedAt"> & { agentId: string }> {
  const { live } = readKv()
  return Object.entries(live).map(([agentId, position]) => ({
    agentId,
    pixelX: position.pixelX,
    pixelY: position.pixelY,
    targetX: position.targetX,
    targetY: position.targetY,
    direction: position.direction,
    updatedAt: position.updatedAt,
  }))
}

export function writeLiveAgentPositions(positions: Array<{ agentId: string; pixelX: number; pixelY: number; targetX: number; targetY: number; direction: "left" | "right" }>): void {
  const kv = readKv()
  const now = new Date().toISOString()

  for (const position of positions) {
    const current = kv.live[position.agentId] ?? {
      status: "idle" as AgentStatus,
      currentTask: null,
      taskProgress: 0,
      walletBalance: null,
      walletFunded: null,
      updatedAt: now,
      ...position,
    }

    kv.live[position.agentId] = {
      ...current,
      ...position,
      updatedAt: now,
    }
  }

  writeKv(kv)
}

export function seedPersistentAgentState(): void {
  const defaults = defaultSnapshot()
  if (!existsSync(DB_PATH)) writeDb({ configs: defaults.configs, stats: defaults.stats })
  if (!existsSync(KV_PATH)) writeKv({ live: defaults.live })
}
