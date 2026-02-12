import { type NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { ensureTwilioConfig } from "@/lib/env-check"
import { rateLimit, requestKeyFromHeaders } from "@/lib/rate-limiter"

ensureTwilioConfig()

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

/**
 * Send Business Card via SMS/MMS
 * 
 * Request body:
 * - to: recipient phone number
 * - bank: selected bank name
 * - email: sender's email
 * - phone: sender's phone
 * - mediaUrl: URL to vCard file (optional, for MMS)
 */
export async function POST(request: NextRequest) {
  try {
    const key = requestKeyFromHeaders(request.headers)
    const rl = rateLimit(key)
    if (!rl.allowed) {
      return NextResponse.json({ success: false, error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } })
    }

    const body = await request.json()
    const { to, bank, email, phone, mediaUrl } = body

    // Validate required fields
    if (!to || !bank) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: to, bank",
          details: "Both 'to' and 'bank' fields are required to send a business card."
        },
        { status: 400 }
      )
    }

    // Check if Twilio is configured
    const isConfigured = accountSid && authToken && twilioPhoneNumber
    
    // Demo mode: Simulate SMS sending without actual Twilio
    const isDemoMode = process.env.SMS_DEMO_MODE === "true" || !isConfigured
    
    if (isDemoMode) {
      const mockMessageId = `DEMO_${Date.now()}_${Math.random().toString(36).substring(7)}`
      const configStatus = !isConfigured ? "(credentials missing)" : "(SMS_DEMO_MODE enabled)"
      console.log(`[DEMO MODE] Business card simulated: ${mockMessageId} ${configStatus}`)
      console.log(`[DEMO MODE] From: ${bank}, To: ${to}`)
      
      return NextResponse.json({
        success: true,
        messageId: mockMessageId,
        status: "demo",
        bank,
        to: to,
        demo: true,
        details: "Business card sent in demo mode"
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
      console.log(`[DEMO MODE FALLBACK] Business card simulated due to initialization error: ${mockMessageId}`)
      return NextResponse.json({
        success: true,
        messageId: mockMessageId,
        status: "demo",
        bank,
        to: to,
        demo: true,
        details: "Business card sent in demo mode (initialization error)"
      })
    }

    // Format business card message
    const businessCardMessage = `
BUSINESS CARD
━━━━━━━━━━━━━━━
Bank: ${bank}
${email ? `Email: ${email}` : ""}
${phone ? `Phone: ${phone}` : ""}
━━━━━━━━━━━━━━━
Shared via Ecobank Mobile App
`.trim()

    // Format phone number to international format
    const formattedPhone = formatPhoneNumber(to)

    // Build message options
    const messageOptions: any = {
      body: businessCardMessage,
      from: twilioPhoneNumber,
      to: formattedPhone,
    }

    // Add vCard attachment if mediaUrl is provided (MMS)
    if (mediaUrl) {
      messageOptions.mediaUrl = [mediaUrl]
    }

    // Send message via Twilio
    const twilioMessage = await client.messages.create(messageOptions)

    console.log(`Business card sent successfully: ${twilioMessage.sid}`)

    return NextResponse.json({
      success: true,
      messageId: twilioMessage.sid,
      status: twilioMessage.status,
      bank,
      to: formattedPhone,
    })
  } catch (error: unknown) {
    console.error("Business Card SMS Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to send business card"
    
    // Check if this is an authentication error - if so, fall back to demo mode
    if (errorMessage.includes("Authenticate") || errorMessage.includes("authentication") || errorMessage.includes("Unauthorized")) {
      console.warn("Twilio authentication failed, falling back to demo mode")
      const mockMessageId = `DEMO_${Date.now()}_${Math.random().toString(36).substring(7)}`
      const body = await request.json()
      return NextResponse.json({
        success: true,
        messageId: mockMessageId,
        status: "demo",
        bank: body.bank,
        to: body.to,
        demo: true,
        details: "Business card sent in demo mode (authentication error)"
      })
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: "An error occurred while sending the business card. Please try again later."
      },
      { status: 500 }
    )
  }
}

/**
 * Format phone number to E.164 international format
 * Handles various Nigerian phone number formats
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "")

  // Handle local Nigerian format (starts with 0)
  if (cleaned.startsWith("0")) {
    cleaned = "+234" + cleaned.substring(1)
  }
  // Handle 234 prefix without '+'
  else if (cleaned.startsWith("234") && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned
  }
  // Handle international format without '+' prefix
  else if (!cleaned.startsWith("+")) {
    cleaned = "+234" + cleaned
  }

  // Fix double country codes (+2340...)
  if (cleaned.startsWith("+2340")) {
    cleaned = "+234" + cleaned.substring(4)
  }

  // Validate Nigerian number format (13-14 digits with +234 prefix)
  const isValidNigerianNumber =
    (cleaned.length === 13 || cleaned.length === 14) &&
    cleaned.startsWith("+234") &&
    cleaned.substring(4).length >= 9

  if (isValidNigerianNumber) {
    return cleaned
  }

  throw new Error(`Invalid phone number format: ${phone} (formatted to ${cleaned})`)
}
