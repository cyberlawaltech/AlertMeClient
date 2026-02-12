# Twilio SMS Configuration Guide

## Overview
This guide helps you set up Twilio SMS functionality for the AlertMeClient application. If you're seeing "Failed to send SMS: Authenticate" errors, it means the Twilio credentials are either missing or invalid.

## Quick Start

### Option 1: Demo Mode (Development)
If you don't have Twilio credentials yet or want to test without sending real SMS:

```bash
echo "SMS_DEMO_MODE=true" >> .env.local
npm run dev
```

This will simulate SMS sending without Twilio and return mock message IDs.

### Option 2: Set Up Real Twilio (Production)
Follow these steps to enable real SMS sending:

#### 1. Create a Twilio Account
- Go to [https://www.twilio.com/console](https://www.twilio.com/console)
- Sign up or log in
- Navigate to the Account Dashboard

#### 2. Get Your Credentials
In the Twilio Console, you'll find:
- **Account SID**: Your Twilio account identifier
- **Auth Token**: Your authentication token (keep this secret!)
- **Phone Number**: A Twilio-provisioned phone number (e.g., +1 area code)

#### 3. Configure Environment Variables

**For Local Development:**

Create a `.env.local` file in the project root (this directory):

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+12203008040
```

For Nigerian numbers, you may need to configure your Twilio phone number to support Nigerian recipients. Contact Twilio support if you see phone number validation errors.

**For Production (Vercel, Netlify, etc.):**

Add these environment variables through your deployment platform's dashboard:

- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Build & Deploy → Environment  
- **Other platforms**: Check your provider's documentation

#### 4. Test Your Configuration

**Verify credentials are working:**
```bash
curl -X GET "http://localhost:3000/api/sms/verify"
```

Expected success response:
```json
{
  "success": true,
  "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "friendlyName": "My Twilio Account",
  "status": "active"
}
```

**Send a test SMS:**
```bash
curl -X POST "http://localhost:3000/api/sms/send" \
  -H "Content-Type: application/json" \
  -d '{"to":"+234XXXXXXXXXX","message":"Test message","type":"general"}'
```

## Troubleshooting

### "Failed to send SMS: Authenticate"
This error occurs when:
1. **Twilio credentials are missing** - Set up the environment variables
2. **Invalid Account SID or Auth Token** - Double-check your credentials in the Twilio Console
3. **Auth Token has changed** - Verify you're using the current token

**Solution:**
- Check that `.env.local` exists and contains valid credentials
- Restart your development server after creating `.env.local`
- Use `curl -X GET "http://localhost:3000/api/sms/verify"` to test credentials

### "Invalid phone number format"
This occurs when the recipient phone number isn't in the correct format.

**Nigerian number examples:**
- ✅ `+234XXXXXXXXXX` (14 digits total)
- ✅ `0XXXXXXXXXX` (11 digits - will be converted)
- ❌ `234XXXXXXXXXX` (missing +)

### Temporary "Demo Mode" Responses
If SMS responses show `"demo": true`, it means:
- Demo mode is enabled via `SMS_DEMO_MODE=true`, OR
- Twilio credentials are not configured

This is expected behavior for development. To switch to real SMS sending, configure proper Twilio credentials.

## Security Notes

⚠️ **NEVER commit `.env.local` to version control** - it contains your Twilio Auth Token!

The project's `.gitignore` already ignores `.env.*` files, so you're protected if you store credentials locally.

For production, always use your deployment platform's secure environment variable system:
- Vercel Secrets
- Netlify Build Environment Variables
- AWS Systems Manager Parameter Store
- GitHub Secrets (with caution)
- HashiCorp Vault

## Advanced Configuration

### Rate Limiting
SMS sending is rate-limited per IP address to prevent abuse:
- Default: 30 requests per minute per IP
- Location: `lib/rate-limiter.ts`

### Fallback Behavior
If Twilio authentication fails at runtime, the system automatically falls back to demo mode:
- Sends a mock message ID
- Logs the failure for debugging
- Prevents transaction processing from blocking on SMS errors

This ensures your application continues to work even if SMS temporarily fails.

## Testing

### Unit Tests
Run SMS tests:
```bash
npm run test -- __tests__/twilio-sms.test.ts
npm run test -- __tests__/sms-error-handler.test.ts
```

### Integration Tests
```bash
npm run test -- __tests__/transfer-integration.test.ts
```

## Support

- **Twilio Support**: Visit [https://support.twilio.com](https://support.twilio.com)
- **SMS API Endpoint**: `POST /api/sms/send`
- **Verify Endpoint**: `GET /api/sms/verify`
- **Status Endpoint**: `GET /api/sms/status`

## Environment Variable Reference

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `TWILIO_ACCOUNT_SID` | Yes* | `ACxxxx...` | From Twilio Console |
| `TWILIO_AUTH_TOKEN` | Yes* | `auth_token` | Keep secret! |
| `TWILIO_PHONE_NUMBER` | Yes* | `+12203008040` | Twilio-provisioned number |
| `SMS_DEMO_MODE` | No | `true` | Enable to test without Twilio |

*Only required if using real SMS. Not needed if SMS_DEMO_MODE=true.
