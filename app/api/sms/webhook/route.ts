import { type NextRequest, NextResponse } from "next/server"
import { verifyTwilioSignature } from "@/lib/twilio-utils"
import { appendWebhookEvent, setSMSAcknowledgment } from "@/lib/webhook-store"
import { incrementWebhookEvent } from "@/lib/metrics"

/**
 * Twilio webhook endpoint for message status callbacks (and other callbacks).
 * Verifies Twilio signature and logs status updates. Extend to persist to DB/queue.
 */
export async function POST(request: NextRequest) {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const signature = request.headers.get("x-twilio-signature")

    // Parse urlencoded body (Twilio posts form-encoded data)
    const contentType = request.headers.get("content-type") || ""
    let params: Record<string, string> = {}

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.text()
      const sp = new URLSearchParams(text)
      for (const [k, v] of sp) {
        params[k] = v
      }
    } else {
      try {
        const fd = await request.formData()
        for (const [k, v] of fd.entries()) {
          params[k] = String(v)
        }
      } catch (e) {
        // fallback: try json
        try {
          const body = await request.json()
          for (const k of Object.keys(body || {})) {
            params[k] = String((body as any)[k])
          }
        } catch (err) {
          // no body parsed
        }
      }
    }

    const valid = verifyTwilioSignature(authToken, signature, request.url, params)
    if (!valid) {
      console.warn("Invalid Twilio signature for webhook", { url: request.url })
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 403 })
    }

    // Extract common Twilio fields
    const messageSid = params["MessageSid"] || params["SmsSid"] || params["MessageSid".toLowerCase()]
    const messageStatus = params["MessageStatus"] || params["SmsStatus"] || params["MessageStatus".toLowerCase()]
    const to = params["To"] || params["to"]
    const from = params["From"] || params["from"]
    const errorCode = params["ErrorCode"] || params["ErrorCode".toLowerCase()]
    const errorMessage = params["ErrorMessage"] || params["ErrorMessage".toLowerCase()]

    const payload = { messageSid, messageStatus, to, from, errorCode, errorMessage, raw: params }

    // Persist to file-backed store
    try {
      await appendWebhookEvent(payload)
    } catch (e) {
      console.warn("Failed to persist webhook event:", e)
    }

    // Track SMS acknowledgment status
    if (messageSid) {
      setSMSAcknowledgment(messageSid, messageStatus || "unknown")
    }

    // Update in-memory metrics
    incrementWebhookEvent(messageStatus)

    console.log("Twilio webhook received:", payload)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Twilio webhook handler error:", err)
    return NextResponse.json({ success: false, error: "Webhook handler error" }, { status: 500 })
  }
}
