# Production Twilio & SMS Configuration

## Overview

This guide explains how to configure the AlertMeClient for **production mode** with Twilio SMS alerts that are sent **exactly once per transaction**.

## Production Mode Requirements

### 1. **Twilio Credentials (Required)**

The application now enforces production mode - SMS_DEMO_MODE fallback has been removed. You **must** provide valid Twilio credentials.

#### Required Environment Variables:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

#### Getting Your Credentials:

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Log in to your account
3. Copy **Account SID** from the dashboard
4. Copy **Auth Token** from the dashboard
5. Use your **Twilio-provisioned phone number** (ensure it supports your target country)

### 2. **Deployment Configuration**

#### Local Development (Testing):
```bash
# Create .env.local in the project root
echo "TWILIO_ACCOUNT_SID=ACxxxxx..." >> .env.local
echo "TWILIO_AUTH_TOKEN=..." >> .env.local
echo "TWILIO_PHONE_NUMBER=+1..." >> .env.local
```

#### Production Deployment:

**Vercel:**
- Go to Project Settings → Environment Variables
- Add the three variables above
- Redeploy the application

**Netlify:**
- Go to Site Settings → Build & Deploy → Environment
- Add the three variables above
- Trigger a new deploy

**AWS/GCP/Other Platforms:**
- Use your provider's secrets management system
- Ensure variables are available at runtime

### 3. **Demo Mode (Development/Testing Only)**

If you want to test without sending real SMS:

```bash
echo "SMS_DEMO_MODE=true" >> .env.local
```

**Warning:** Demo mode only works with this explicit flag. Credentials are no longer optional.

## SMS Alert Deduplication

### Problem Solved:
Previously, SMS alerts could be sent multiple times for the same transaction due to:
- Multiple SMS sending functions being called
- Retry logic triggering duplicates
- Race conditions in concurrent sends

### Solution:
A deduplication manager now ensures:
- ✅ **Exactly one SMS per transaction ID**
- ✅ **Automatic duplicate prevention**
- ✅ **5-minute expiry window for sent records**
- ✅ **Pending/In-progress state tracking**

### How It Works:

1. When a transaction is created, a unique ID is generated
2. Before sending SMS, the deduplication manager checks if an alert was already sent
3. If not, it marks the transaction as "pending"
4. After successful send, it marks as "sent"
5. Any subsequent SMS attempts for the same transaction are rejected

### Implementation Details:

**File:** `lib/sms-deduplication.ts`

```typescript
// Check if already sent
if (!smsDeduplicationManager.hasBeenSent(transactionId)) {
  // Mark as pending
  if (smsDeduplicationManager.markPending(transactionId)) {
    // Send SMS
    const result = await sendAlertSMS(...)
    
    // Mark as sent
    smsDeduplicationManager.markSent(transactionId, messageId)
  }
}
```

## SMS Sending Flow (Single Path)

### Before (Multiple Paths - Duplicates):
1. Transfer screen sends SMS directly
2. DataStore sends generic alert
3. DataStore sends bank-specific alert
4. DataStore sends credit alert to recipient
5. **Result:** 2-4 SMS per transaction ❌

### After (Single Path - No Duplicates):
1. Transaction is created via `dataStore.addTransaction()`
2. DataStore sends SMS using deduplication check
3. Only sends bank-specific template (if available) OR generic alert (not both)
4. Deduplication prevents any duplicate sends
5. **Result:** 1 SMS per transaction ✅

## Verification

### Test Twilio Credentials:
```bash
curl -X GET "http://localhost:3000/api/sms/verify"
```

Expected response (success):
```json
{
  "success": true,
  "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "friendlyName": "My Twilio Account",
  "status": "active"
}
```

Expected response (missing credentials):
```json
{
  "success": false,
  "error": "Twilio not configured"
}
```

### Send Test SMS:
```bash
curl -X POST "http://localhost:3000/api/sms/send" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+234801234567",
    "message": "Test message from AlertMe",
    "type": "general"
  }'
```

## Migration Checklist

- [ ] Get Twilio Account SID from console
- [ ] Get Twilio Auth Token from console
- [ ] Get Twilio Phone Number (or provision new one)
- [ ] Add environment variables to `.env.local` (development)
- [ ] Test with `/api/sms/verify` endpoint
- [ ] Test with `/api/sms/send` endpoint
- [ ] Create a test transaction to verify SMS
- [ ] Add environment variables to production deployment platform
- [ ] Deploy to production
- [ ] Monitor SMS sending logs for errors
- [ ] Verify billing/credits on Twilio account

## Troubleshooting

### Error: "SMS service not configured"
**Cause:** Missing Twilio credentials  
**Fix:** Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to environment

### Error: "Failed to initialize Twilio client"
**Cause:** Invalid credentials  
**Fix:** Verify Account SID and Auth Token in Twilio Console

### SMS Sending Times Out
**Cause:** Network issues or Twilio service issues  
**Fix:** Check Twilio status page at https://status.twilio.com

### Duplicate SMS Attempts
**Cause:** This should not happen with deduplication enabled  
**Fix:** Check logs for "Alert already sent or in progress" message

### Phone Number Validation Errors
**Cause:** Invalid or unsupported phone number format  
**Fix:** Ensure numbers are in E.164 format (e.g., +234801234567)

## Support

- **Twilio Support:** https://support.twilio.com
- **SMS API Endpoint:** `POST /api/sms/send`
- **Verify Endpoint:** `GET /api/sms/verify`
- **Deduplication Manager:** `lib/sms-deduplication.ts`

## Security Notes

⚠️ **NEVER commit credentials to version control**
- `.env.local` is already in `.gitignore`
- Use deployment platform's secret management for production
- Rotate Auth Token regularly in Twilio Console
- Monitor API usage in Twilio Dashboard for suspicious activity
