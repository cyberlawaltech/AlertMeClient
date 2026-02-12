/**
 * Production Alert Test Script
 * Sends 10 real production SMS alerts using different template types and banks
 */

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000"

interface AlertConfig {
  id: number
  type: "debit" | "credit" | "balance" | "lowBalance"
  bank: string
  to: string
  message: string
}

// Template generators for small alerts (under 160 chars)
function generateAlert(config: Omit<AlertConfig, "id" | "to">): string {
  const reference = `REF${Date.now()}${config.id || Math.floor(Math.random() * 1000)}`
  
  switch (config.type) {
    case "debit":
      return `ALERT: Debit NGN${config.bank === "Opay" ? "5,000" : "3,000"} to ${config.bank === "PalmPay" ? "John" : "Mike"}. Bal: NGN${config.bank === "First Bank" ? "45,000" : "50,000"}. Ref: ${reference}`
    case "credit":
      return `ALERT: Credit NGN${config.bank === "Zenith" ? "7,500" : "2,000"} from ${config.bank === "GTBank" ? "Sarah" : "Emma"}. Bal: NGN${config.bank === "Ecobank" ? "32,000" : "55,000"}. Ref: ${reference}`
    case "balance":
      return `ALERT: Your ${config.bank} account balance is NGN${config.bank === "Opay" ? "12,500" : "25,000"}`
    case "lowBalance":
      return `ALERT: Low balance warning. Your ${config.bank} balance is NGN${config.bank === "PalmPay" ? "500" : "1,000"}.`
    default:
      return "ALERT: Notification from your bank"
  }
}

// Test alert configurations - 10 alerts: 3 debit, 3 credit, 2 balance, 2 lowBalance
const alertConfigs: Array<Omit<AlertConfig, "id" | "to">> = [
  // 3 Debit Alerts
  { type: "debit", bank: "GTBank", message: "" },
  { type: "debit", bank: "First Bank", message: "" },
  { type: "debit", bank: "Zenith Bank", message: "" },
  // 3 Credit Alerts
  { type: "credit", bank: "Opay", message: "" },
  { type: "credit", bank: "PalmPay", message: "" },
  { type: "credit", bank: "Ecobank", message: "" },
  // 2 Balance Alerts
  { type: "balance", bank: "Access Bank", message: "" },
  { type: "balance", bank: "UBA", message: "" },
  // 2 LowBalance Alerts
  { type: "lowBalance", bank: "Sterling Bank", message: "" },
  { type: "lowBalance", bank: "Kuda Bank", message: "" },
]

// Generate full alerts with messages
const alerts: AlertConfig[] = alertConfigs.map((config, index) => ({
  ...config,
  id: index + 1,
  to: `+234800000000${index + 1}`,
  message: generateAlert(config),
}))

interface SMSResponse {
  success: boolean
  messageId?: string
  status?: string
  demo?: boolean
  error?: string
}

interface HealthResponse {
  success: boolean
  metrics?: {
    totalSent: number
    totalFailed: number
    lastActivity?: string
  }
}

async function checkHealth(): Promise<boolean> {
  console.log("\n=== Health Check ===")
  try {
    const response = await fetch(`${API_BASE_URL}/api/sms/metrics`)
    const data: HealthResponse = await response.json()
    
    if (data.success && data.metrics) {
      console.log("✅ SMS Service is operational")
      console.log(`   Total Sent: ${data.metrics.totalSent}`)
      console.log(`   Total Failed: ${data.metrics.totalFailed}`)
      if (data.metrics.lastActivity) {
        console.log(`   Last Activity: ${data.metrics.lastActivity}`)
      }
      return true
    } else {
      console.log("❌ SMS Service health check returned unsuccessful status")
      return false
    }
  } catch (error) {
    console.log("❌ Failed to connect to SMS service health check")
    console.log(`   Error: ${error}`)
    return false
  }
}

async function sendAlert(alert: AlertConfig): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: alert.to,
        message: alert.message,
        type: alert.type,
      }),
    })

    const data: SMSResponse = await response.json()

    if (data.success) {
      const isDemo = data.demo || data.messageId?.startsWith("DEMO_") || false
      return {
        success: true,
        messageId: data.messageId,
      }
    } else {
      return {
        success: false,
        error: data.error || "Unknown error",
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection error",
    }
  }
}

async function runProductionTest(): Promise<void> {
  console.log("=" .repeat(60))
  console.log("  PRODUCTION ALERT TEST - 10 SMS NOTIFICATIONS")
  console.log("=" .repeat(60))
  console.log(`\nAPI Base URL: ${API_BASE_URL}`)
  console.log(`Timestamp: ${new Date().toISOString()}`)

  // Step 1: Health Check
  const isHealthy = await checkHealth()
  if (!isHealthy) {
    console.log("\n⚠️  Warning: SMS service may not be fully operational")
    console.log("   Continuing with test...\n")
  }

  // Step 2: Send 10 Alerts
  console.log("\n=== Sending 10 Production Alerts ===")
  console.log("- 3 Debit Alerts | 3 Credit Alerts | 2 Balance Alerts | 2 LowBalance Alerts")
  console.log("- Using different banks/wallets: GTBank, First Bank, Zenith, Opay, PalmPay, etc.\n")

  const results: Array<{
    id: number
    type: string
    bank: string
    to: string
    messageId?: string
    success: boolean
    error?: string
    messageLength: number
  }> = []

  for (const alert of alerts) {
    console.log(`[${alert.id}/10] Sending ${alert.type} alert to ${alert.to} (${alert.bank})...`)
    
    const result = await sendAlert(alert)
    const messageLength = alert.message.length
    
    results.push({
      id: alert.id,
      type: alert.type,
      bank: alert.bank,
      to: alert.to,
      messageId: result.messageId,
      success: result.success,
      error: result.error,
      messageLength,
    })

    if (result.success && result.messageId) {
      const isRealTwilioSid = result.messageId.startsWith("SM") && result.messageId.length > 10
      console.log(`   ✅ SUCCESS: ${result.messageId}`)
      console.log(`   📱 Type: ${alert.type.toUpperCase()} | Bank: ${alert.bank}`)
      console.log(`   📏 Length: ${messageLength} chars | To: ${alert.to}`)
      if (isRealTwilioSid) {
        console.log(`   🎯 Real Twilio SID confirmed`)
      }
    } else {
      console.log(`   ❌ FAILED: ${result.error || "Unknown error"}`)
    }
    console.log("")

    // Small delay between messages to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  // Step 3: Summary
  console.log("=" .repeat(60))
  console.log("  TEST SUMMARY")
  console.log("=" .repeat(60))

  const successCount = results.filter((r) => r.success).length
  const failureCount = results.filter((r) => !r.success).length
  const realSidCount = results.filter((r) => r.messageId?.startsWith("SM") && r.messageId.length > 10).length

  console.log(`\n📊 Results:`)
  console.log(`   Total Alerts: ${results.length}`)
  console.log(`   Successful: ${successCount}`)
  console.log(`   Failed: ${failureCount}`)
  console.log(`   Real Twilio SIDs: ${realSidCount}`)

  console.log(`\n📋 Message SIDs:`)
  results.forEach((r) => {
    const status = r.success ? (r.messageId?.startsWith("SM") ? "🎯 REAL" : "⚠️ CHECK") : "❌ FAIL"
    console.log(`   ${status} [${r.id}] ${r.type.toUpperCase()} (${r.bank}): ${r.messageId || r.error}`)
  })

  // Final health check
  console.log("\n=== Final Health Check ===")
  await checkHealth()

  console.log("\n" + "=".repeat(60))
  console.log("  TEST COMPLETE")
  console.log("=".repeat(60))
}

// Run the test
runProductionTest()
  .then(() => {
    console.log("\n✅ Test script completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Test script failed:", error)
    process.exit(1)
  })
