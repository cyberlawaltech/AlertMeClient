import { type NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { ensureTwilioConfig } from "@/lib/env-check"
import { rateLimit, requestKeyFromHeaders } from "@/lib/rate-limiter"

// Validate env on cold start (will warn if missing)fik
ensureTwilioConfig()

// Initialize Twilio client with environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

export async function POST(request: NextRequest) {
  try {
    // Simple in-memory rate limiting (per-IP) — suitable for immediate mitigation only.
    const key = requestKeyFromHeaders(request.headers)
    const rl = rateLimit(key)
    if (!rl.allowed) {
      return NextResponse.json({ success: false, error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } })
    }

    const body = await request.json()
    const { to, message, type } = body

    if (!to || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: to, message",
          details: "Both 'to' and 'message' fields are required to send an SMS."
        },
        { status: 400 }
      )
    }

    // PRODUCTION MODE: Twilio credentials MUST be configured
    const isConfigured = accountSid && authToken && twilioPhoneNumber
    
    if (!isConfigured) {
      console.error("[PRODUCTION MODE] Twilio credentials not configured!")
      return NextResponse.json(
        {
          success: false,
          error: "SMS service not configured",
          details: "Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) are required in production."
        },
        { status: 503 }
      )
    }

    // Check for explicit demo mode flag (for testing only)
    const isDemoMode = process.env.SMS_DEMO_MODE === "true"
    
    if (isDemoMode) {
      // Generate a mock message ID
      const mockMessageId = `DEMO_${Date.now()}_${Math.random().toString(36).substring(7)}`
      
      console.log(`[DEMO MODE] SMS simulated successfully: ${mockMessageId}`)
      console.log(`[DEMO MODE] To: ${to}, Message: ${message.substring(0, 50)}...`)
      
      return NextResponse.json({
        success: true,
        messageId: mockMessageId,
        status: "demo",
        type: type || "general",
        demo: true,
        details: "SMS sent in demo mode"
      })
    }

    // Initialize Twilio client with error handling
    let client
    try {
      client = twilio(accountSid, authToken)
    } catch (initError) {
      console.error("Failed to initialize Twilio client:", initError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to initialize Twilio",
          details: "Could not initialize Twilio client with provided credentials."
        },
        { status: 503 }
      )
    }

    // Format phone number for international format
    const formattedPhone = formatPhoneNumber(to)

    // Send SMS via Twilio
    const twilioMessage = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedPhone,
    })

    console.log(`SMS sent successfully: ${twilioMessage.sid}`)

    return NextResponse.json({
      success: true,
      messageId: twilioMessage.sid,
      status: twilioMessage.status,
      type: type || "general",
    })
  } catch (error: unknown) {
    console.error("Twilio SMS Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to send SMS"
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: "An error occurred while sending the SMS. Please try again later."
      },
      { status: 500 }
    )
  }
}

function formatPhoneNumber(phone: string): string {
  // 1. Remove all whitespace and hyphens
  let cleaned = phone.trim().replace(/[\s\-\(\)]/g, "")

  // 2. Extract only digits and + sign
  const hasPlus = cleaned.includes("+")
  cleaned = cleaned.replace(/[^\d+]/g, "")
  
  // 3. Remove all + signs first, we'll add back one at the start
  cleaned = cleaned.replace(/\+/g, "")

  // 4. Handle local Nigerian format (starts with 0)
  if (cleaned.startsWith("0")) {
    cleaned = "234" + cleaned.substring(1)
  }
  // 5. Handle US format (10 digits, no country code)
  else if (cleaned.length === 10 && !cleaned.startsWith("234") && !cleaned.startsWith("1")) {
    // Assume Nigerian (add 234)
    cleaned = "234" + cleaned
  }
  // 6. Handle US numbers that might be missing +1
  else if (cleaned.length === 10 || (cleaned.length > 10 && cleaned.length <= 11)) {
    // Check if it looks like a US number (try 1 prefix)
    if (!cleaned.startsWith("1") && !cleaned.startsWith("234")) {
      // Assume it's already in US format, add 1
      cleaned = "1" + cleaned
    }
  }
  // 7. Ensure proper country prefix
  else if (!cleaned.startsWith("1") && !cleaned.startsWith("234")) {
    // Try to guess - if 10-11 digits, probably US or NG
    if (cleaned.length >= 10 && cleaned.length <= 14) {
      // Default to Nigerian
      cleaned = "234" + cleaned
    }
  }

  // 8. Remove any duplicate prefixes
  if (cleaned.startsWith("12341")) {
    cleaned = "1" + cleaned.substring(4)
  } else if (cleaned.startsWith("234234")) {
    cleaned = cleaned.substring(3)
  } else if (cleaned.startsWith("11")) {
    cleaned = "1" + cleaned.substring(2)
  }

  // 9. Add the + prefix for E.164 international format
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned
  }

  // 10. Validate format
  const isValidUSNumber = cleaned.match(/^\+1\d{10}$/) // +1 followed by 10 digits
  const isValidNigerianNumber = cleaned.match(/^\+234\d{10}$/) // +234 followed by 10 digits

  if (isValidUSNumber || isValidNigerianNumber) {
    return cleaned
  }

  // If not perfect but close, still attempt (Twilio validates on its end)
  if ((cleaned.startsWith("+1") || cleaned.startsWith("+234")) && cleaned.length >= 12) {
    console.warn(
      `[SMS] Phone number format may be slightly invalid: ${phone} -> ${cleaned}, but attempting to send`
    )
    return cleaned
  }

  // Last resort fallback
  console.warn(`[SMS] Could not format phone number: ${phone} -> ${cleaned}, using as-is`)
  return cleaned
}
