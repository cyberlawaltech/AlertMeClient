"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronDown, Home, Loader2, User, CreditCard, DollarSign, Receipt } from "@/components/ui/iconify-compat"
import { dataStore } from "@/lib/data-store"
import { formatCurrency } from "@/lib/form-utils"

interface EnhancedTransferScreenProps {
  onBack: () => void
  onContinue: () => void
  transferData: any
}

export function EnhancedTransferScreen({ onBack, onContinue, transferData }: EnhancedTransferScreenProps) {
  const [isTransferring, setIsTransferring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const userData = dataStore.getUserData()
  const transferFee = 30.0

  const handleContinue = async () => {
    try {
      setIsTransferring(true)
      setError(null)

      // Validate transfer data
      if (!transferData?.amount || !transferData?.beneficiaryName) {
        throw new Error("Invalid transfer data")
      }

      const transferAmount = Number.parseFloat(transferData.amount)
      const totalAmount = transferAmount + transferFee

      // Check sufficient balance
      if (userData.balance < totalAmount) {
        throw new Error("Insufficient balance for this transaction")
      }

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Pass enriched data with fee to next screen
      onContinue()
    } catch (err) {
      setIsTransferring(false)
      setError(err instanceof Error ? err.message : "Transfer failed. Please try again.")
      console.error("Transfer error:", err)
    }
  }

  if (isTransferring) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-green-50/20 flex items-center justify-center relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-20 right-10 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-40 left-5 w-24 h-24 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-lg animate-bounce"></div>

        <div className="text-center bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 max-w-sm mx-4">
          <div className="relative mb-6">
            <Loader2 className="h-16 w-16 animate-spin text-[#004A9F] mx-auto" />
            <div className="absolute inset-0 rounded-full border-4 border-[#004A9F]/20 animate-ping"></div>
          </div>
          <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Processing Transfer...
          </h2>
          <p className="text-gray-600 mb-4">Please wait while we process your transfer</p>
          <div className="text-lg font-semibold text-[#004A9F] mb-4">
            ₦{formatCurrency(Number.parseFloat(transferData?.amount || "0"))}
          </div>
          <div className="text-sm text-gray-500 mb-4">to {transferData?.beneficiaryName}</div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-[#004A9F] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[#004A9F] rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-2 h-2 bg-[#004A9F] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-green-50/20 relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute top-20 right-10 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-40 left-5 w-24 h-24 bg-gradient-to-br from-green-400/10 to-blue-400/10 rounded-full blur-lg animate-bounce"></div>

      {/* Enhanced Header */}
      <div className="bg-white/95 backdrop-blur-xl px-4 py-4 flex items-center justify-between border-b border-gray-200/50 shadow-lg relative z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="hover:bg-blue-50/50 hover:scale-105 transition-all duration-200 rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          Transfer Confirmation
        </h1>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-blue-50/50 hover:scale-105 transition-all duration-200 rounded-xl"
        >
          <Home className="h-5 w-5" />
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Enhanced Transfer Details */}
      <div className="px-4 py-6 space-y-6">
        {/* From Account with Enhanced Design */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <User className="h-4 w-4 text-[#004A9F]" />
            From
          </label>
          <div className="bg-gradient-to-r from-white/90 to-gray-50/90 backdrop-blur-sm rounded-2xl p-5 flex items-center justify-between border border-white/50 shadow-md hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-800">Savings account</div>
                <div className="text-xs text-gray-600 font-medium">{userData.name}</div>
                <div className="text-xs text-gray-500">Balance: ₦{formatCurrency(userData.balance)}</div>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* To Account with Enhanced Design */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <User className="h-4 w-4 text-[#004A9F]" />
            To
          </label>
          <div className="bg-gradient-to-r from-white/90 to-blue-50/90 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-md hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-800">{transferData.beneficiaryName}</div>
                <div className="text-xs text-gray-600 font-medium">{transferData.bank}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Amount with Enhanced Design */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-[#004A9F]" />
            Amount
          </label>
          <div className="bg-gradient-to-r from-green-50/90 to-emerald-50/90 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-md">
            <div className="text-3xl font-bold text-green-600 mb-2">
              ₦{formatCurrency(Number.parseFloat(transferData.amount))}
            </div>
            {transferData.remark && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Remark:</span> {transferData.remark}
              </div>
            )}
          </div>
        </div>

        {/* Transaction Summary with Enhanced Design */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#004A9F]" />
            Transaction Summary
          </label>
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-md space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
              <span className="text-sm text-gray-600">Transfer Amount</span>
              <span className="font-semibold text-gray-800">
                ₦{formatCurrency(Number.parseFloat(transferData.amount))}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
              <span className="text-sm text-gray-600">Transfer Fee</span>
              <span className="font-semibold text-gray-800">₦{transferFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl px-3">
              <span className="text-sm font-bold text-gray-800">Total Amount</span>
              <span className="font-bold text-lg text-[#004A9F]">
                ₦{formatCurrency(Number.parseFloat(transferData.amount) + transferFee)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-xl border-t border-gray-200/50 shadow-2xl">
        <Button
          onClick={handleContinue}
          disabled={isTransferring}
          className="w-full h-14 bg-gradient-to-r from-[#004A9F] to-[#0072C6] hover:from-[#003875] hover:to-[#005A9F] text-white font-bold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTransferring ? "Processing..." : "Confirm Transfer"}
        </Button>
      </div>
    </div>
  )
}
