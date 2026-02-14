# SMS Alert Fallback & Non-Blocking Execution

## Summary

Added intelligent fallback mechanism for SMS alerts with non-blocking execution to ensure robust SMS delivery while keeping the transaction process fast.

## Key Features

### 1. **Dual-Method Fallback**
```
Try Bank-Specific Template First
  ↓ (If successful)
Mark as sent ✅

  ↓ (If fails)
Try Generic Debit Alert
  ↓ (If successful)
Mark as sent ✅

  ↓ (If both fail)
Mark as failed & Log error
```

### 2. **Non-Blocking Execution**
- SMS sending happens in background using fire-and-forget pattern
- Transaction completes immediately without waiting for SMS
- User gets instant feedback on transaction success
- SMS status tracked separately via deduplication manager

### 3. **Automatic Fallback Logic**

**Primary Method (Bank-Specific):**
```typescript
// Tries to use bank's specific SMS template
SMSService.sendDynamicTransactionAlert(
  bank, 
  transactionData, 
  complianceOptions
)
```

**Fallback Method (Generic):**
```typescript
// Falls back to generic debit alert
sendTransactionAlert({
  to: phone,
  message: genericDebitAlert,
  type: "debit"
})
```

### 4. **Detailed Logging**

All stages are logged for debugging:
```
[SMS] Attempting bank-specific alert for First Bank...
[SMS] ⚠️ Bank-specific alert failed, trying generic alert...
[SMS] Attempting generic debit alert...
[SMS] ✅ Generic debit alert sent for transaction txn_123
```

Or:
```
[SMS] ✅ Bank-specific alert sent for transaction txn_123
```

## How It Works

### Before (Sequential & Blocking):
```
Transaction added
  → Send SMS (await)
  → If fails, just log error
  → Return to user
```

### After (Parallel & Non-Blocking):
```
Transaction added ✅
  ↓
Return to user immediately ✅
  ↓ (parallel - background)
Send bank-specific SMS
  ↓ (fails)
Try generic SMS
  ↓ (succeeds)
Mark as sent ✅
```

## Code Changes

### Location: `lib/data-store.ts`

#### Modified: `addTransaction()` method
```typescript
// Fire-and-forget SMS with fallback
this.sendSMSWithFallback(id, newTransaction, reference, this.state.userData)
  .catch((err) => {
    smsDeduplicationManager.markFailed(id)
    console.error(`[SMS] Unhandled error for transaction ${id}:`, err)
  })
```

#### New: `sendSMSWithFallback()` private method
- Implements dual-method retry logic
- Handles both bank-specific and generic SMS
- Non-blocking async execution
- Comprehensive error handling and logging
- Updates deduplication manager with results

## Error Handling

### Scenario: Bank-Specific SMS Fails

```
Try: SendDynamicTransactionAlert for GTBank
Error: Template processing failed
Fallback: SendTransactionAlert (generic)
Result: ✅ Alert sent via generic method
Status: SENT
```

### Scenario: Both Methods Fail

```
Try: SendDynamicTransactionAlert
Error: Network timeout
Fallback: SendTransactionAlert
Error: API unreachable
Result: ❌ Neither method succeeded
Status: FAILED
Action: Logged for investigation
```

### Scenario: No Recipient Phone

```
Check: Is debit transaction with recipient?
Result: No
Action: Mark as sent (no-op)
Status: SENT
```

## Transaction Flow

```
1. User completes transfer → addTransaction() called
2. Transaction ID created (unique identifier)
3. Data stored immediately ← User sees success
4. (Background) SMS fallback logic starts:
   a) Check deduplication (not sent yet)
   b) Mark pending
   c) Try bank-specific SMS
   d) If fails → Try generic SMS
   e) Mark sent/failed
5. Transaction history updated with SMS status
6. Logs available for monitoring
```

## Benefits

| Benefit | Impact |
|---------|--------|
| **Non-Blocking** | Transactions complete instantly, not waiting for SMS |
| **Fallback Retry** | Multiple SMS methods ensure delivery |
| **Smart Deduplication** | Prevents duplicate SMS per transaction |
| **Comprehensive Logging** | Easy to debug SMS failures |
| **Error Isolation** | SMS failures don't block transactions |
| **Status Tracking** | Full visibility into SMS send status |

## Monitoring

### Success Case:
```
[SMS] ✅ Bank-specific alert sent for transaction txn_1707912345-abc123
```

### Fallback Case:
```
[SMS] Bank-specific alert failed, trying generic alert...
[SMS] ✅ Generic debit alert sent for transaction txn_1707912345-abc123
```

### Failure Case:
```
[SMS] ❌ Failed to send SMS alert for transaction txn_1707912345-abc123
(both methods failed)
```

## Testing

### Test Bank-Specific Success:
1. Create transfer (GTBank recipient)
2. Check logs for: `[SMS] ✅ Bank-specific alert sent`
3. Verify deduplication marks as sent

### Test Fallback Logic:
1. Mock GTBank SMS endpoint to fail
2. Create transfer (GTBank recipient)
3. Check logs for fallback messages
4. Verify generic SMS succeeds

### Test No Duplicate Sends:
1. Create transaction
2. Check deduplication logs
3. Verify only ONE SMS is sent (bank or generic, not both)

## Code Example

```typescript
// In dataStore.addTransaction()
if (this.state.settings.smsAlerts) {
  if (!smsDeduplicationManager.hasBeenSent(id)) {
    if (smsDeduplicationManager.markPending(id)) {
      // Fire-and-forget with fallback handling
      this.sendSMSWithFallback(id, newTransaction, reference, this.state.userData)
        .catch((err) => {
          smsDeduplicationManager.markFailed(id)
          console.error(`[SMS] Unhandled error for transaction ${id}:`, err)
        })
    }
  }
}
```

## Configuration

### SMS Alerts (Required):
```bash
# .env.local or deployment environment
TWILIO_ACCOUNT_SID=ACxxxxx...
TWILIO_AUTH_TOKEN=token...
TWILIO_PHONE_NUMBER=+1234567890
```

### Feature Flags (Optional):
```bash
# Enable SMS alerts
SMS_ALERTS_ENABLED=true

# Enable deduplication
SMS_DEDUPLICATION_ENABLED=true
```

## Related Documentation

- `PRODUCTION_SMS_CONFIGURATION.md` - SMS setup and credentials
- `lib/sms-deduplication.ts` - Deduplication manager
- `app/api/sms/send/route.ts` - SMS endpoint
- `lib/sms-service.ts` - SMS service implementation
