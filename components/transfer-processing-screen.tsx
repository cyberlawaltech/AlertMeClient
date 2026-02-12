"use client"

import { useEffect, useState } from "react"
import { Loader2, CreditCard, Shield, CheckCircle, AlertCircle, Lock, Building2, Send } from "@/components/ui/iconify-compat"
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
  const [pulsePhase, setPulsePhase] = useState(0)

  const steps = [
    { 
      icon: Lock, 
      label: "Verifying PIN", 
      description: "Authenticating your transaction",
      color: "from-blue-500 to-blue-600"
    },
    { 
      icon: Building2, 
      label: "Processing Payment", 
      description: "Debiting your account",
      color: "from-[#004A9F] to-blue-700"
    },
    { 
      icon: Send, 
      label: "Sending Money", 
      description: "Crediting recipient account",
      color: "from-[#A4D233] to-green-500"
    },
  ]

  // Pulsing animation effect
  useEffect(() => {
    const pulseTimer = setInterval(() => {
      setPulsePhase((prev) => (prev + 1) % 4)
    }, 1500)
    return () => clearInterval(pulseTimer)
  }, [])

  useEffect(() => {
    if (!transferData) {
      setError("Invalid transfer data")
      setIsProcessing(false)
      return
    }

    console.log("[v0] Transfer processing started with data:", transferData)

    // Single timer that updates progress and steps
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 2, 100)

        setCurrentStep(() => {
          const stepIndex = Math.min(steps.length - 1, Math.floor(next / (100 / steps.length)))
          return stepIndex
        })

        if (next >= 100) {
          clearInterval(timer)
          setIsProcessing(false)

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
    }, 80)

    return () => {
      clearInterval(timer)
    }
  }, [onNavigate, transferData])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#004A9F]/5 via-white to-[#A4D233]/10 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Pulsing Orbs */}
        <div className={`absolute top-20 left-10 w-32 h-32 bg-[#004A9F]/10 rounded-full blur-2xl transition-all duration-1000 ${
          pulsePhase === 0 ? "scale-100 opacity-50" : pulsePhase === 1 ? "scale-125 opacity-75" : "scale-100 opacity-50"
        }`}></div>
        <div className={`absolute bottom-20 right-10 w-40 h-40 bg-[#A4D233]/20 rounded-full blur-2xl transition-all duration-1000 ${
          pulsePhase === 2 ? "scale-100 opacity-50" : pulsePhase === 3 ? "scale-125 opacity-75" : "scale-100 opacity-50"
        }`}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-[#004A9F]/5 to-[#A4D233]/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-[#004A9F] to-[#0072C6] rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-gray-800">Secure Transfer</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Lock className="h-4 w-4" />
            <span>Encrypted</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            {error ? (
              <div className="text-center">
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 animate-bounce">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Transaction Failed</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                  onClick={() => onNavigate("dashboard")}
                  className="inline-flex items-center justify-center px-8 py-3 bg-[#004A9F] hover:bg-[#003875] text-white rounded-full font-medium transition-all hover:scale-105"
                >
                  Return to Dashboard
                </button>
              </div>
            ) : isProcessing ? (
              <div className="text-center">
                {/* Main Loading Animation */}
                <div className="relative mb-8">
                  {/* Outer Ring */}
                  <div className="relative w-32 h-32 mx-auto mb-6">
                    {/* Background ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                    {/* Progress ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90 transform">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${progress * 3.52} 352`}
                        className="transition-all duration-300 ease-out"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#004A9F" />
                          <stop offset="50%" stopColor="#0072C6" />
                          <stop offset="100%" stopColor="#A4D233" />
                        </linearGradient>
                      </defs>
                    </svg>
                    {/* Inner circle with icon */}
                    <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center shadow-lg">
                      {currentStep === 0 ? (
                        <Lock className="h-8 w-8 text-[#004A9F] animate-pulse" />
                      ) : currentStep === 1 ? (
                        <CreditCard className="h-8 w-8 text-[#004A9F] animate-bounce" />
                      ) : (
                        <Send className="h-8 w-8 text-[#A4D233] animate-bounce" />
                      )}
                    </div>
                  </div>
                  
                  {/* Progress percentage */}
                  <div className="text-4xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0072C6] bg-clip-text text-transparent mb-2">
                    {Math.round(progress)}%
                  </div>
                  <div className="text-sm text-gray-500">Processing your transfer</div>
                </div>

                {/* Enhanced Steps Indicator */}
                <div className="mb-8">
                  <div className="flex items-center justify-center mb-6">
                    {steps.map((step, index) => {
                      const IconComponent = step.icon
                      const isActive = index === currentStep
                      const isCompleted = index < currentStep
                      const isPending = index > currentStep
                      
                      return (
                        <div key={index} className="flex items-center">
                          <div className="relative">
                            <div
                              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${
                                isCompleted 
                                  ? "bg-gradient-to-r from-[#A4D233] to-green-500 text-white scale-100"
                                  : isActive
                                    ? `bg-gradient-to-r ${step.color} text-white scale-110 shadow-lg shadow-blue-200`
                                    : "bg-gray-100 text-gray-400 scale-100"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle className="h-7 w-7" />
                              ) : (
                                <IconComponent className={`h-6 w-6 ${isActive ? "animate-pulse" : ""}`} />
                              )}
                            </div>
                            {/* Active indicator */}
                            {isActive && (
                              <div className="absolute -inset-1 rounded-full border-2 border-[#004A9F] animate-ping opacity-25"></div>
                            )}
                          </div>
                          {index < steps.length - 1 && (
                            <div className={`w-16 h-1.5 mx-2 rounded-full transition-all duration-500 ${
                              isCompleted 
                                ? "bg-gradient-to-r from-[#A4D233] to-green-500" 
                                : isPending
                                  ? "bg-gray-200"
                                  : "bg-gradient-to-r from-[#004A9F] to-[#004A9F]/50"
                            }`}></div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Current Step Info */}
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1 animate-pulse">
                      {steps[currentStep].label}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {steps[currentStep].description}
                    </p>
                  </div>
                </div>

                {/* Transfer Details Card */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-gray-100 mb-6">
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold bg-gradient-to-r from-[#004A9F] to-[#0072C6] bg-clip-text text-transparent">
                      ₦ {formatCurrency(Number.parseFloat(transferData?.amount || "0"))}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      to {transferData?.beneficiaryName || "Recipient"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-gray-500 text-xs mb-1">Bank</div>
                      <div className="font-semibold text-gray-800">{transferData?.bank || "Bank"}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-gray-500 text-xs mb-1">Account</div>
                      <div className="font-semibold text-gray-800">{transferData?.accountNumber?.slice(-4).padStart(10, "*") || "****"}</div>
                    </div>
                  </div>
                </div>

                {/* Security Note */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Shield className="h-4 w-4" />
                  <span>Please do not close this page while processing</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/50 backdrop-blur-md px-4 py-3 border-t border-gray-100">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              256-bit SSL
            </span>
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              PCI Compliant
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Ecobank Secured
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
