"use client"

import { useEffect, useState } from "react"
import { Loader2, CreditCard, Shield, CheckCircle, AlertCircle } from "@/components/ui/iconify-compat"
import { dataStore } from "@/lib/data-store"
import { formatCurrency } from "@/lib/form-utils"
import { SMSService } from "@/lib/sms-service"

interface TransferProcessingScreenProps {
  onNavigate: (screen: string, data?: any) => void
  transferData: any
}

export function TransferProcessingScreen({ onNavigate, transferData }: TransferProcessingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const steps = [
    { icon: Shield, label: "Verifying PIN", description: "Authenticating your transaction" },
    { icon: CreditCard, label: "Processing Payment", description: "Debiting your account" },
    { icon: CheckCircle, label: "Sending Money", description: "Crediting recipient account" },
  ]

  useEffect(() => {
    if (!transferData) {
      setError("Invalid transfer data")
      setIsProcessing(false)
      return
    }

    console.log("[v0] Transfer processing started with data:", transferData)

    // Single timer that updates progress and steps. Avoid including `progress` in deps
    // to prevent recreating the effect on every progress change which caused duplicate
    // transaction submissions (multiple overlapping timers).
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 2, 100)

        // Update visual step based on next progress
        setCurrentStep(() => {
          const stepIndex = Math.min(steps.length - 1, Math.floor(next / (100 / steps.length)))
          return stepIndex
        })

        if (next >= 100) {
          clearInterval(timer)
          setIsProcessing(false)

          // Perform transaction flow once when progress completes
          ;(async () => {
            try {
              if (transferData.saveAsBeneficiary) {
                try {
                  dataStore.addBeneficiary({
                    name: transferData.beneficiaryName || "Recipient",
                    bank: transferData.bank,
                    accountNumber: transferData.accountNumber,
                    phone: transferData.phone || "",
                  })
                  console.log("[v0] Beneficiary saved successfully")
                } catch (err) {
                  console.warn("[v0] Failed to save beneficiary:", err)
                }
              }

              const id = await dataStore.addTransaction({
                type: `Transfer to ${transferData.bank || transferData.provider || "Recipient"}`,
                amount: Number.parseFloat(transferData.amount || "0"),
                recipient: transferData.beneficiaryName || "Recipient",
                description: `Transfer to ${transferData.beneficiaryName}`,
                status: "Successful",
                isDebit: true,
                section: "Today",
                recipientBank: transferData.bank || transferData.provider,
                recipientAccount: transferData.accountNumber || transferData.phoneNumber || transferData.cardNumber,
                fee: transferData.fee || 30,
              })

              // Fire-and-forget SMS notification
              let messageId: string | null = null
              try {
                const userData = dataStore.getUserData()
                const amount = Number.parseFloat(transferData.amount || "0")
                const balance = userData.balance - amount
                const message = SMSService.generateDebitAlert(
                  amount,
                  transferData.beneficiaryName || "Recipient",
                  balance,
                  id,
                  transferData.bank || "ECOBANK",
                )

                SMSService.sendTransactionAlert({ to: userData.phone, message, type: "debit" })
                  .then((smsResult) => {
                    if (!smsResult?.success) {
                      console.warn("[Transfer] SMS alert failed:", SMSService.getLastError() || "Unknown SMS error")
                    } else if (smsResult.messageId) {
                      messageId = smsResult.messageId
                    }
                  })
                  .catch((err) => console.warn("[Transfer] SMS sending error:", err))
              } catch (smsErr) {
                console.warn("[Transfer] SMS background error:", smsErr)
              }

              const successData = {
                ...transferData,
                id,
                beneficiaryName: transferData?.beneficiaryName || "Recipient",
                timestamp: new Date().toISOString(),
                smsStatus: "pending",
                messageId: messageId,
              }

              onNavigate("transaction-success", successData)
            } catch (err) {
              console.error("[Transfer] Failed to add transaction:", err)
              setError("Failed to process transaction. Please try again.")
            }
          })()
        }

        return next
      })
    }, 100)

    return () => {
      clearInterval(timer)
    }
  }, [onNavigate, transferData])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm mx-auto">
        {error ? (
          <>
            <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Transaction Failed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => onNavigate("dashboard")}
              className="inline-flex items-center justify-center px-6 py-2 bg-[#004A9F] hover:bg-[#003875] text-white rounded-lg font-medium"
            >
              Return to Dashboard
            </button>
          </>
        ) : isProcessing ? (
          <>
            {/* Main Loading Animation */}
            <div className="relative mb-8">
              <div className="w-24 h-24 mx-auto mb-4 relative">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                <div
                  className="absolute inset-0 rounded-full border-4 border-[#004A9F] border-t-transparent animate-spin"
                  style={{
                    background: `conic-gradient(from 0deg, #004A9F ${progress * 3.6}deg, transparent ${progress * 3.6}deg)`,
                    borderRadius: "50%",
                  }}
                ></div>
                <div className="absolute inset-4 bg-[#004A9F] rounded-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#004A9F] mb-2">{Math.round(progress)}%</div>
            </div>

            {/* Current Step */}
            <div className="mb-8">
              <div className="flex items-center justify-center mb-4">
                {steps.map((step, index) => {
                  const IconComponent = step.icon
                  return (
                    <div key={index} className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          index <= currentStep ? "bg-[#004A9F] text-white" : "bg-gray-200 text-gray-400"
                        }`}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`w-8 h-1 mx-2 ${index < currentStep ? "bg-[#004A9F]" : "bg-gray-200"}`}></div>
                      )}
                    </div>
                  )
                })}
              </div>

              <h2 className="text-xl font-semibold mb-2">{steps[currentStep].label}</h2>
              <p className="text-gray-600 text-sm">{steps[currentStep].description}</p>
            </div>

            {/* Transfer Details */}
            <div className="bg-white rounded-lg p-4 text-left">
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-[#004A9F]">
                  ₦ {formatCurrency(Number.parseFloat(transferData?.amount || "0"))}
                </div>
                <div className="text-sm text-gray-600">to {transferData?.beneficiaryName || "Recipient"}</div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Bank:</span>
                  <span className="font-medium">{transferData?.bank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account:</span>
                  <span className="font-medium">{transferData?.accountNumber}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-500">Please do not close this page while processing...</div>
          </>
        ) : null}
      </div>
    </div>
  )
}
