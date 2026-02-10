import {
  generateDebitAlert,
  generateCreditAlert,
  generateBalanceInquiryAlert,
  generateLowBalanceAlert,
  getAllSMSTemplates,
} from "./alert-templates"
import { NIGERIAN_BANKS } from "./banks-data"

export interface SMSAlert {
  to: string
  message: string
  type: "debit" | "credit" | "balance" | "general"
}

export interface SMSTemplate {
  id: string
  name: string
  content: string
  variables: string[]
  category: "transaction" | "marketing" | "notification"
}

export interface BusinessCard {
  sender: string
  accountNumber?: string
  bank?: string
  phone?: string
  email?: string
}

export class SMSService {
  private static retryAttempts = 3
  private static retryDelay = 1000 // ms
  private static lastError: string | null = null

  static getLastError(): string | null {
    return this.lastError
  }

  // Re-export alert generators for backward compatibility
  static generateDebitAlert = generateDebitAlert
  static generateCreditAlert = generateCreditAlert
  static generateBalanceInquiryAlert = generateBalanceInquiryAlert
  static generateLowBalanceAlert = generateLowBalanceAlert

  private static async retryFetch(
    url: string,
    options: RequestInit,
    attempts = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, options)
      if (!response.ok && attempts < this.retryAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay))
        return this.retryFetch(url, options, attempts + 1)
      }
      return response
    } catch (error) {
      if (attempts < this.retryAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay))
        return this.retryFetch(url, options, attempts + 1)
      }
      throw error
    }
  }

  static async sendTransactionAlert(alert: SMSAlert): Promise<{ success: boolean; messageId?: string }> {
    try {
      const response = await this.retryFetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alert),
      })

      const result = await response.json()

      if (!result.success) {
        this.lastError = `Failed to send SMS: ${result.error || "Unknown error"}`
        console.error(this.lastError)
        return { success: false }
      }

      console.log(`SMS sent successfully: ${result.messageId}`)
      this.lastError = null
      return { success: true, messageId: result.messageId }
    } catch (error) {
      this.lastError = `SMS Service Error: ${error instanceof Error ? error.message : String(error)}`
      console.error(this.lastError)
      return { success: false }
    }
  }

  static async sendDynamicTransactionAlert(
    bankName: string,
    transactionData: {
      amount: number
      recipient: string
      sender: string
      balance: number
      reference: string
      beneficiaryName: string
      accountNumber: string
      description: string
      transactionType: string
    },
    complianceOptions?: {
      includeRegulatoryDisclaimer?: boolean
      includeOptOut?: boolean
    }
  ): Promise<boolean> {
    try {
      const template = await this.getTemplateForBank(bankName)
      if (!template) {
        console.warn(`No template found for bank: ${bankName}, using default template`)
        const defaultTemplate = this.getDefaultTemplates().find(t => t.id === "debit_alert")
        if (!defaultTemplate) {
          throw new Error("No default template available")
        }
        const message = this.processTemplate(defaultTemplate.content, {
          amount: transactionData.amount.toString(),
          recipient: transactionData.recipient,
          balance: transactionData.balance.toString(),
          reference: transactionData.reference,
          time: new Date().toLocaleTimeString(),
        })
        
        return (await this.sendTransactionAlert({
          to: transactionData.recipient,
          message,
          type: "debit"
        })).success
      }
      
      let message = this.processTemplate(template.content, {
        account_number: transactionData.accountNumber,
        amount: transactionData.amount.toString(),
        transaction_type: transactionData.transactionType,
        beneficiary_name: transactionData.beneficiaryName,
        description: transactionData.description,
        balance: transactionData.balance.toString(),
        reference: transactionData.reference,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
      })
      
      if (complianceOptions?.includeRegulatoryDisclaimer) {
        message += "\n\nThis is a system-generated message. Do not reply."
      }
      
      if (complianceOptions?.includeOptOut) {
        message += "\nReply STOP to opt out of transaction alerts."
      }
      
      return (await this.sendTransactionAlert({
        to: transactionData.recipient,
        message,
        type: "debit"
      })).success
    } catch (error) {
      this.lastError = `Dynamic SMS Service Error: ${error instanceof Error ? error.message : String(error)}`
      console.error(this.lastError)
      return false
    }
  }

  static async getTemplateForBank(bankName: string): Promise<SMSTemplate | null> {
    const templates = this.getDefaultTemplates()
    const bankTemplate = templates.find(template => 
      template.name.toLowerCase().includes(bankName.toLowerCase())
    )
    return bankTemplate || null
  }

  /**
   * Get all SMS templates for a specific bank
   */
  static getTemplatesForBank(bankName: string): SMSTemplate[] {
    const templates = this.getDefaultTemplates()
    return templates.filter(template => 
      template.name.toLowerCase().includes(bankName.toLowerCase())
    )
  }

  /**
   * Get templates by type (debit, credit, balance, low_balance)
   */
  static getTemplatesByType(bankName: string, type: "debit" | "credit" | "balance" | "low_balance"): SMSTemplate | undefined {
    const bankTemplates = this.getTemplatesForBank(bankName)
    return bankTemplates.find(t => t.id.includes(type))
  }

  /**
   * Get all available banks with their template counts
   */
  static getBanksWithTemplates(): Array<{ name: string; type: "bank" | "wallet"; templateCount: number }> {
    const templates = this.getDefaultTemplates()
    const bankCounts: Record<string, { type: "bank" | "wallet"; count: number }> = {}

    templates.forEach(template => {
      const bankName = template.name.split(" - ")[0]
      const bank = NIGERIAN_BANKS.find(b => b.name === bankName)
      if (bank && !bankCounts[bank.name]) {
        bankCounts[bank.name] = { type: bank.type, count: 0 }
      }
      if (bankCounts[bankName]) {
        bankCounts[bankName].count++
      }
    })

    return Object.entries(bankCounts).map(([name, data]) => ({
      name,
      type: data.type,
      templateCount: data.count,
    }))
  }

  static async sendBusinessCard(to: string, card: BusinessCard): Promise<boolean> {
    try {
      const response = await this.retryFetch("/api/sms/business-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, ...card }),
      })

      const result = await response.json()
      if (!result.success) {
        this.lastError = `Business Card SMS Error: ${result.error || "Unknown error"}`
        return false
      }
      this.lastError = null
      return true
    } catch (error) {
      this.lastError = `Business Card SMS Error: ${error instanceof Error ? error.message : String(error)}`
      console.error(this.lastError)
      return false
    }
  }

  static async sendBulkSMS(alerts: SMSAlert[]): Promise<{ sent: number; failed: number }> {
    let sent = 0
    let failed = 0

    for (const alert of alerts) {
      const success = await this.sendTransactionAlert(alert)
      if (success) {
        sent++
      } else {
        failed++
      }
    }

    return { sent, failed }
  }

  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^(\+234|234|0)?[789][01]\d{8}$/
    return phoneRegex.test(phone.replace(/\s+/g, ""))
  }

  static formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\s+/g, "")

    if (cleaned.startsWith("0")) {
      cleaned = "+234" + cleaned.substring(1)
    } else if (cleaned.startsWith("234")) {
      cleaned = "+" + cleaned
    } else if (!cleaned.startsWith("+234")) {
      cleaned = "+234" + cleaned
    }

    return cleaned
  }

  static getDefaultTemplates(): SMSTemplate[] {
    // Generate templates for all banks and wallets
    const allTemplates: SMSTemplate[] = []
    const bankTemplates = getAllSMSTemplates()

    // Create templates for each bank
    bankTemplates.forEach((bankData, index) => {
      // Debit alert template
      allTemplates.push({
        id: `debit_${bankData.bank.toLowerCase().replace(/\s+/g, "_")}`,
        name: `${bankData.bank} - Debit Alert`,
        content: bankData.templates.debit,
        variables: ["amount", "recipient", "balance", "reference"],
        category: "transaction",
      })

      // Credit alert template
      allTemplates.push({
        id: `credit_${bankData.bank.toLowerCase().replace(/\s+/g, "_")}`,
        name: `${bankData.bank} - Credit Alert`,
        content: bankData.templates.credit,
        variables: ["amount", "sender", "balance", "reference"],
        category: "transaction",
      })

      // Balance inquiry template
      allTemplates.push({
        id: `balance_${bankData.bank.toLowerCase().replace(/\s+/g, "_")}`,
        name: `${bankData.bank} - Balance Alert`,
        content: bankData.templates.balance,
        variables: ["balance"],
        category: "notification",
      })

      // Low balance template
      allTemplates.push({
        id: `low_balance_${bankData.bank.toLowerCase().replace(/\s+/g, "_")}`,
        name: `${bankData.bank} - Low Balance Alert`,
        content: bankData.templates.lowBalance,
        variables: ["balance"],
        category: "notification",
      })
    })

    return allTemplates
  }

  static processTemplate(template: string, variables: Record<string, string>): string {
    let processed = template

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`
      processed = processed.replace(new RegExp(placeholder, "g"), value)
    })

    return processed
  }
}
