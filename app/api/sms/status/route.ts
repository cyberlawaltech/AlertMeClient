import { type NextRequest, NextResponse } from "next/server"
import { getSMSAcknowledgment } from "@/lib/webhook-store"

/**
 * API endpoint to check SMS acknowledgment status
 * Clients can poll this endpoint to verify if their SMS was delivered
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const messageSid = searchParams.get("messageSid")

    if (!messageSid) {
      return NextResponse.json(
        { success: false, error: "Missing messageSid parameter" },
        { status: 400 }
      )
    }

    const status = getSMSAcknowledgment(messageSid)

    if (status) {
      return NextResponse.json({
        success: true,
        messageSid,
        acknowledged: true,
        status: status.status,
        timestamp: status.timestamp,
      })
    } else {
      return NextResponse.json({
        success: true,
        messageSid,
        acknowledged: false,
        status: "pending",
        message: "SMS status not yet received from Twilio",
      })
    }
  } catch (err) {
    console.error("SMS status check error:", err)
    return NextResponse.json(
      { success: false, error: "Failed to check SMS status" },
      { status: 500 }
    )
  }
}
