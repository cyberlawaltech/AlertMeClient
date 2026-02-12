"use client"

import { useState } from "react"
import { useSoundInitialization, useNotificationSound } from "@/hooks/useSound"
import { Button } from "@/components/ui/button"
import SoundToggle from "@/components/sound-toggle"
import { Card, CardContent } from "@/components/ui/card"
import {
  Menu,
  Bell,
  Eye,
  ArrowDownToLine,
  ArrowUpFromLine,
  Copy,
  MoreHorizontal,
  HomeIcon,
  InboxIcon,
  CreditCardIcon,
  UserIcon,
  CogIcon,
  Receipt,
  Smartphone,
  Globe,
} from "@/components/ui/iconify-compat"

interface DashboardProps {
  onNavigate: (screen: string) => void
  onMenuToggle: () => void
}

export function Dashboard({ onNavigate, onMenuToggle }: DashboardProps) {
  const [isMoreExpanded, setIsMoreExpanded] = useState(false)
  const [showRecentTransactions, setShowRecentTransactions] = useState(true)
  useSoundInitialization()
  const playNotification = useNotificationSound()

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b">
        <Button variant="ghost" size="icon" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Hello John</span>
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">J</span>
          </div>
          <div className="pl-2">
            <SoundToggle />
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => playNotification()}>
          <Bell className="h-5 w-5" />
        </Button>
      </div>

      {/* Eco Limit Banner */}
      <div className="px-4 py-3">
        <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-gray-600">Eco Limit 1</span>
          <Button size="sm" className="bg-[#A4D233] hover:bg-[#8BC220] text-black text-xs">
            Upgrade Limit
          </Button>
        </div>
      </div>

      {/* Account Balance Card */}
      <div className="px-4 mb-6">
        <Card className="bg-gradient-to-r from-[#004A9F] to-[#0072C6] text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-white/80 text-sm">Ecobank</div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white"
                onClick={() => onNavigate("transactions")}
              >
                Transaction history
              </Button>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white/80 text-sm">Available Balance</span>
                <Eye className="h-4 w-4 text-white/80" />
              </div>
              <div className="text-3xl font-bold">₦ 150,000.20</div>
            </div>

            <div className="flex justify-between text-sm">
              <div>
                <div className="text-white/80">A/C Name</div>
                <div className="font-medium">JOHN KINGSLEY</div>
              </div>
              <div className="text-right">
                <div className="text-white/80">A/C Number</div>
                <div className="font-medium">0099348976</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Transaction */}
      <div className="px-4 mb-6">
        <h3 className="text-lg font-semibold mb-4">QUICK TRANSACTION</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full mb-2 border-[#004A9F] text-[#004A9F] bg-transparent"
              onClick={() => onNavigate("add-funds")}
            >
              <ArrowDownToLine className="h-5 w-5" />
            </Button>
            <span className="text-xs">Add Money</span>
          </div>
          <div className="text-center">
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full mb-2 border-[#004A9F] text-[#004A9F] bg-transparent"
              onClick={() => onNavigate("transfer-options")}
            >
              <ArrowUpFromLine className="h-5 w-5" />
            </Button>
            <span className="text-xs">Send Money</span>
          </div>
          <div className="text-center">
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full mb-2 border-[#004A9F] text-[#004A9F] bg-transparent"
              onClick={() => onNavigate("currency")}
            >
              <Copy className="h-5 w-5" />
            </Button>
            <span className="text-xs">Topup Phone</span>
          </div>
          <div className="text-center">
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full mb-2 border-[#004A9F] text-[#004A9F] bg-transparent"
              onClick={() => {
                setIsMoreExpanded(!isMoreExpanded)
                setShowRecentTransactions(!isMoreExpanded)
              }}
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
            <span className="text-xs">More</span>
          </div>
        </div>
      </div>

      {/* Expandable More Section */}
      {isMoreExpanded && (
        <div className="px-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <h4 className="text-sm font-semibold mb-3 text-gray-700">Additional Services</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-12 h-12 rounded-full mb-2 border-[#004A9F] text-[#004A9F] bg-transparent"
                  onClick={() => onNavigate("loans")}
                >
                  <CreditCardIcon className="h-5 w-5" />
                </Button>
                <span className="text-xs">Loans</span>
              </div>
              <div className="text-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-12 h-12 rounded-full mb-2 border-[#004A9F] text-[#004A9F] bg-transparent"
                  onClick={() => onNavigate("pay-bills")}
                >
                  <Receipt className="h-5 w-5" />
                </Button>
                <span className="text-xs">Pay Bills</span>
              </div>
              <div className="text-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-12 h-12 rounded-full mb-2 border-[#004A9F] text-[#004A9F] bg-transparent"
                  onClick={() => onNavigate("pos")}
                >
                  <Smartphone className="h-5 w-5" />
                </Button>
                <span className="text-xs">POS</span>
              </div>
              <div className="text-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-12 h-12 rounded-full mb-2 border-[#004A9F] text-[#004A9F] bg-transparent"
                  onClick={() => onNavigate("currency")}
                >
                  <Globe className="h-5 w-5" />
                </Button>
                <span className="text-xs">Currency</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions - Collapsible */}
      <div className="px-4 mb-20">
        {showRecentTransactions ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Transactions</h3>
              <Button variant="link" className="text-[#004A9F] text-sm p-0" onClick={() => onNavigate("transactions")}>
                See all
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-sm">Transfer to other bank</div>
                    <div className="text-xs text-gray-500">May 19, 2023 10:15AM</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-500 font-medium">- ₦ 20,000.00</div>
                  <div className="text-xs text-green-600">Successful</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-sm">Transfer to other bank</div>
                    <div className="text-xs text-gray-500">May 18, 2023 10:15AM</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-500 font-medium">- ₦ 30,000.00</div>
                  <div className="text-xs text-orange-600">Pending</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="bg-gray-100 rounded-lg p-4 cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={() => {
              setShowRecentTransactions(true)
              setIsMoreExpanded(false)
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recent Transactions</h3>
              <span className="text-sm text-gray-600">Click to expand</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
        <div className="flex justify-around items-center">
          <button className="flex flex-col items-center justify-center gap-1 flex-1 transition-all duration-200 hover:scale-105 active:scale-95">
            <HomeIcon className="h-6 w-6 mx-auto" style={{ color: "#004A9F" }} />
            <span className="text-xs font-medium" style={{ color: "#004A9F" }}>Home</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-1 flex-1 transition-all duration-200 hover:scale-105 active:scale-95">
            <InboxIcon className="h-6 w-6 text-gray-400 mx-auto" />
            <span className="text-xs text-gray-400">Inbox</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-1 flex-1 transition-all duration-200 hover:scale-105 active:scale-95">
            <CreditCardIcon className="h-6 w-6 text-gray-400 mx-auto" />
            <span className="text-xs text-gray-400">Cards</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-1 flex-1 transition-all duration-200 hover:scale-105 active:scale-95" onClick={() => onNavigate("beneficiary-management")}>
            <UserIcon className="h-6 w-6 text-gray-400 mx-auto" />
            <span className="text-xs text-gray-400">Beneficiaries</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-1 flex-1 transition-all duration-200 hover:scale-105 active:scale-95" onClick={() => onNavigate("settings")}>
            <CogIcon className="h-6 w-6 text-gray-400 mx-auto" />
            <span className="text-xs text-gray-400">Settings</span>
          </button>
        </div>
      </div>
    </div>
  )
}
