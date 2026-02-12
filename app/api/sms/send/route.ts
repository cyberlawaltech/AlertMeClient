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

    // Check if Twilio is configured
    const isConfigured = accountSid && authToken && twilioPhoneNumber
    
    // Demo mode: Simulate SMS sending without actual Twilio
    const isDemoMode = process.env.SMS_DEMO_MODE === "true" || !isConfigured
    
    if (isDemoMode) {
      // Generate a mock message ID
      const mockMessageId = `DEMO_${Date.now()}_${Math.random().toString(36).substring(7)}`
      
      const configStatus = !isConfigured ? "(credentials missing)" : "(SMS_DEMO_MODE enabled)"
      console.log(`[DEMO MODE] SMS simulated successfully: ${mockMessageId} ${configStatus}`)
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
      // Fall back to demo mode on initialization failure
      const mockMessageId = `DEMO_${Date.now()}_${Math.random().toString(36).substring(7)}`
      console.log(`[DEMO MODE FALLBACK] SMS simulated due to initialization error: ${mockMessageId}`)
      return NextResponse.json({
        success: true,
        messageId: mockMessageId,
        status: "demo",
        type: type || "general",
        demo: true,
        details: "SMS sent in demo mode (initialization error)"
      })
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
    
    // Check if this is an authentication error - if so, fall back to demo mode
    if (errorMessage.includes("Authenticate") || errorMessage.includes("authentication") || errorMessage.includes("Unauthorized")) {
      console.warn("Twilio authentication failed, falling back to demo mode")
      const mockMessageId = `DEMO_${Date.now()}_${Math.random().toString(36).substring(7)}`
      return NextResponse.json({
        success: true,
        messageId: mockMessageId,
        status: "demo",
        type: type || "general",
        demo: true,
        details: "SMS sent in demo mode (authentication error)"
      })
    }
    
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
  // 1. Remove all non-digit characters first, preserving optional leading '+'
  let cleaned = phone.replace(/[^\d+]/g, "").replace(/\+/g, "")
  let hasPlus = phone.includes("+")

  // 2. Handle local Nigerian format (starts with 0)
  if (cleaned.startsWith("0")) {
    cleaned = "234" + cleaned.substring(1)
  } 
  // 3. Ensure 234 prefix is present
  else if (!cleaned.startsWith("234")) {
    // Last resort: try prepending 234 if it looks like a phone number
    if (cleaned.length >= 10) {
      cleaned = "234" + cleaned
    }
  }

  // 4. Remove any duplicate +234 or 234 prefixes
  if (cleaned.startsWith("234234")) {
    cleaned = cleaned.substring(3)
  }

  // 5. Add the + prefix for international format
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned
  }

  // 6. Final validation: Twilio expects E.164 format (+234XXXXXXXXXX = 14 chars total)
  const isValidNigerianNumber = cleaned.length === 14 && cleaned.startsWith("+234")
  
  if (isValidNigerianNumber) {
    return cleaned
  }

  // If length is off by a little, try to make it work (in case of test data)
  if (cleaned.startsWith("+234") && cleaned.length > 10) {
    // Return what we have - Twilio will handle validation on its end
    console.warn(`[SMS] Phone number format may be invalid: ${phone} -> ${cleaned}, but attempting to send anyway`)
    return cleaned
  }

  // Last resort: if completely invalid format, still return something rather than throwing
  console.warn(`[SMS] Invalid phone number format: ${phone} -> ${cleaned}, using as-is`)
  return cleaned
}
