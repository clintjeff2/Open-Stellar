import { describe, it, expect, beforeEach } from "vitest"
import { GET } from "@/app/api/agents/leaderboard/route"
import { resetXpLeaderboardStore, recordXpEvent } from "@/lib/agents/xp-leaderboard-store"

describe("GET /api/agents/leaderboard", () => {
  beforeEach(() => {
    resetXpLeaderboardStore()
  })

  it("returns leaderboard entries sorted by XP", async () => {
    const prefix = "xp-agent-"
    for (let i = 1; i <= 5; i++) {
      const agentId = `${prefix}${i}`
      recordXpEvent(agentId, i * 100)
    }
    
    const req = new Request(`http://localhost/api/agents/leaderboard?limit=2`)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    
    expect(data.ok).toBe(true)
    expect(data.total).toBe(5)
    expect(data.entries.length).toBe(2)
    expect(data.entries[0].agentId).toBe(`${prefix}5`)
    expect(data.entries[0].rank).toBe(1)
    expect(data.entries[1].agentId).toBe(`${prefix}4`)
    expect(data.entries[1].rank).toBe(2)
  })

  it("handles different time windows", async () => {
    const agentId = "window-agent"
    const now = Date.now()
    const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000
    
    recordXpEvent(agentId, 500, tenDaysAgo)
    recordXpEvent(agentId, 200, now)
    
    // All time
    let res = await GET(new Request("http://localhost/api/agents/leaderboard?window=all"))
    let data = await res.json()
    expect(data.entries[0].xp).toBe(700)
    
    // 7 days
    res = await GET(new Request("http://localhost/api/agents/leaderboard?window=7d"))
    data = await res.json()
    expect(data.entries[0].xp).toBe(200)
  })
})
