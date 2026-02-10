import fs from "fs"
import path from "path"

const DATA_DIR = path.resolve(process.cwd(), "data")
const FILE_PATH = path.join(DATA_DIR, "twilio-webhooks.jsonl")

async function ensureDataDir() {
  try {
    await fs.promises.mkdir(DATA_DIR, { recursive: true })
  } catch (err) {
    // ignore
  }
}

export async function appendWebhookEvent(event: Record<string, any>): Promise<void> {
  await ensureDataDir()
  const line = JSON.stringify({ receivedAt: new Date().toISOString(), event }) + "\n"
  await fs.promises.appendFile(FILE_PATH, line, "utf8")
}

export async function readWebhookEvents(limit = 100): Promise<Record<string, any>[]> {
  try {
    const data = await fs.promises.readFile(FILE_PATH, "utf8")
    const lines = data.trim().split(/\r?\n/).filter(Boolean)
    const recent = lines.slice(-limit)
    return recent.map((l) => JSON.parse(l))
  } catch (err) {
    return []
  }
}

// Map to track SMS acknowledgment status in memory
const smsAcknowledgmentStatus: Map<string, { status: string; timestamp: string }> = new Map()

export function setSMSAcknowledgment(messageSid: string, status: string): void {
  smsAcknowledgmentStatus.set(messageSid, { status, timestamp: new Date().toISOString() })
}

export function getSMSAcknowledgment(messageSid: string): { status: string; timestamp: string } | undefined {
  return smsAcknowledgmentStatus.get(messageSid)
}
