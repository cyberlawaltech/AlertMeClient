Deployment to Production (Vercel)

Overview

This project is ready to deploy to Vercel. The SMS API is configured to use Twilio and expects the production credentials to be provided as environment variables in the host.

Required repository secrets / environment variables (do NOT commit these to Git):

- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER
- VERCEL_TOKEN (for GitHub Actions automated deploy)
- VERCEL_ORG_ID (optional but recommended)
- VERCEL_PROJECT_ID (optional but recommended)

Quick manual deploy (recommended for first-time setup)

1. Sign in to Vercel and create a new project (Import from GitHub).
2. In the Vercel project settings → Environment Variables, add the Twilio credentials:
   - Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in the "Production" environment.
3. Deploy the project from Vercel UI (select the `main` branch).
4. After deploy finishes, verify the `/api/sms/verify` endpoint:

```bash
curl -X GET "https://<your-vercel-domain>/api/sms/verify"
```

Expect a JSON response showing `success: true` and `accountSid`.

GitHub Actions (CI) setup

A workflow `/.github/workflows/deploy-to-vercel.yml` has been added that will run on `push` to `main`.

Before using the workflow, add these repository Secrets in GitHub:

- `VERCEL_TOKEN` — a Vercel token with deploy permissions
- `VERCEL_ORG_ID` — your Vercel organization id (optional)
- `VERCEL_PROJECT_ID` — your Vercel project id (optional)

The workflow executes `npx vercel --prod` using `VERCEL_TOKEN`. If you prefer, you can replace the deploy step with the official Vercel Action or any other provider's action.

Notes & post-deploy checks

- Confirm Twilio credentials are correct in Vercel environment variables.
- Verify `/api/sms/verify` returns success in production.
- Send a test SMS using the running production URL:

```bash
curl -s -X POST "https://<your-vercel-domain>/api/sms/send" \
  -H "Content-Type: application/json" \
  -d '{"to":"+2348141712023","message":"Production test SMS from AlertMe","type":"general"}'
```

- Monitor the logs in Vercel and the Twilio console for delivery.

Rollback & Safety

- If you need to roll back, revert the commit on `main` or use the Vercel dashboard to select an older deployment.
- Ensure the production Twilio account has sufficient sending allowance to avoid limits (Account 2 previously hit a daily limit).

If you'd like, I can:
- Configure the GitHub Secrets placeholders for you (you'll need to supply `VERCEL_TOKEN` etc.)
- Replace the `npx vercel` step with a Vercel Action variant
- Trigger the first deploy (requires `VERCEL_TOKEN` or using your Vercel UI)
