/**
 * SMS Deduplication Service
 * Ensures SMS alerts are sent only once per transaction
 */

interface SMSRecord {
  transactionId: string
  timestamp: number
  messageId?: string
  status: "pending" | "sent" | "failed"
}

class SMSDeduplicationManager {
  private sentSMS: Map<string, SMSRecord> = new Map()
  private readonly EXPIRY_TIME = 5 * 60 * 1000 // 5 minutes - SMS should be sent within this time

  /**
   * Check if SMS has already been sent for this transaction
   */
  hasBeenSent(transactionId: string): boolean {
    const record = this.sentSMS.get(transactionId)
    if (!record) return false

    // Check if record has expired
    const age = Date.now() - record.timestamp
    if (age > this.EXPIRY_TIME) {
      this.sentSMS.delete(transactionId)
      return false
    }

    return record.status === "sent"
  }

  /**
   * Check if SMS sending is in progress for this transaction
   */
  isInProgress(transactionId: string): boolean {
    const record = this.sentSMS.get(transactionId)
    if (!record) return false

    // Check if record has expired
    const age = Date.now() - record.timestamp
    if (age > this.EXPIRY_TIME) {
      this.sentSMS.delete(transactionId)
      return false
    }

    return record.status === "pending"
  }

  /**
   * Mark SMS as pending for this transaction
   * Returns false if already marked/sent
   */
  markPending(transactionId: string): boolean {
    if (this.hasBeenSent(transactionId) || this.isInProgress(transactionId)) {
      return false
    }

    this.sentSMS.set(transactionId, {
      transactionId,
      timestamp: Date.now(),
      status: "pending",
    })
    return true
  }

  /**
   * Mark SMS as successfully sent
   */
  markSent(transactionId: string, messageId?: string): void {
    const record = this.sentSMS.get(transactionId)
    if (record) {
      record.status = "sent"
      record.messageId = messageId
    } else {
      this.sentSMS.set(transactionId, {
        transactionId,
        timestamp: Date.now(),
        messageId,
        status: "sent",
      })
    }
  }

  /**
   * Mark SMS as failed
   */
  markFailed(transactionId: string): void {
    const record = this.sentSMS.get(transactionId)
    if (record) {
      record.status = "failed"
    } else {
      this.sentSMS.set(transactionId, {
        transactionId,
        timestamp: Date.now(),
        status: "failed",
      })
    }
  }

  /**
   * Get SMS record for transaction
   */
  getRecord(transactionId: string): SMSRecord | undefined {
    return this.sentSMS.get(transactionId)
  }

  /**
   * Clear old records (cleanup)
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.sentSMS.entries()) {
      if (now - record.timestamp > this.EXPIRY_TIME) {
        this.sentSMS.delete(key)
      }
    }
  }

  /**
   * Reset all records (for testing)
   */
  reset(): void {
    this.sentSMS.clear()
  }

  /**
   * Get stats
   */
  getStats(): { total: number; pending: number; sent: number; failed: number } {
    const stats = {
      total: this.sentSMS.size,
      pending: 0,
      sent: 0,
      failed: 0,
    }

    for (const record of this.sentSMS.values()) {
      if (record.status === "pending") stats.pending++
      else if (record.status === "sent") stats.sent++
      else if (record.status === "failed") stats.failed++
    }

    return stats
  }
}

// Singleton instance
export const smsDeduplicationManager = new SMSDeduplicationManager()

// Run cleanup every 10 seconds
setInterval(() => {
  smsDeduplicationManager.cleanup()
}, 10000)

export type { SMSRecord }
