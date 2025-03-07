"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Save, Building, Receipt, Percent, Globe } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useUser } from "@/components/auth/user-provider"
import { supabase } from "@/lib/supabase"

export default function SettingsPage() {
  const { toast } = useToast()
  const { isAdmin } = useUser()

  // Business Information
  const [businessInfo, setBusinessInfo] = useState({
    name: "My POS Store",
    address: "123 Main Street, City, Country",
    phone: "+1 (555) 123-4567",
    email: "contact@myposstore.com",
    website: "www.myposstore.com",
    taxId: "TAX-12345-ID",
    logo: "/placeholder.svg",
  })

  // Tax Settings
  const [taxSettings, setTaxSettings] = useState({
    enableTax: true,
    taxRate: 7,
    taxName: "Sales Tax",
    taxNumber: "TAX-12345-ID",
    applyTaxToAll: true,
  })

  // Receipt Settings
  const [receiptSettings, setReceiptSettings] = useState({
    showLogo: true,
    showTaxDetails: true,
    footerText: "Thank you for your purchase!",
    printAutomatically: true,
    emailReceipt: true,
    receiptPrefix: "INV-",
  })

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    language: "en",
    currency: "USD",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    lowStockAlert: true,
    lowStockThreshold: 5,
    enableDarkMode: true,
    autoLogout: true,
    logoutTime: 30,
  })

  // Load settings from database on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Fetch business settings
        const { data: businessData } = await supabase.from("settings").select("*").eq("type", "business").single()

        if (businessData?.settings) {
          setBusinessInfo(businessData.settings)
        }

        // Fetch tax settings
        const { data: taxData } = await supabase.from("settings").select("*").eq("type", "tax").single()

        if (taxData?.settings) {
          setTaxSettings(taxData.settings)
        }

        // Fetch receipt settings
        const { data: receiptData } = await supabase.from("settings").select("*").eq("type", "receipt").single()

        if (receiptData?.settings) {
          setReceiptSettings(receiptData.settings)
        }

        // Fetch system settings
        const { data: systemData } = await supabase.from("settings").select("*").eq("type", "system").single()

        if (systemData?.settings) {
          setSystemSettings(systemData.settings)
        }
      } catch (error) {
        console.error("Error loading settings:", error)
      }
    }

    loadSettings()
  }, [])

  const handleBusinessInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setBusinessInfo((prev) => ({ ...prev, [name]: value }))
  }

  const handleTaxSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setTaxSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleTaxRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value)
    if (!isNaN(value) && value >= 0) {
      setTaxSettings((prev) => ({ ...prev, taxRate: value }))
    }
  }

  const handleReceiptSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement
    setReceiptSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSystemSettingsChange = (name: string, value: any) => {
    setSystemSettings((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveSettings = async (settingType: string) => {
    try {
      let settingsData

      switch (settingType) {
        case "business":
          settingsData = businessInfo
          break
        case "tax":
          settingsData = taxSettings
          break
        case "receipt":
          settingsData = receiptSettings
          break
        case "system":
          settingsData = systemSettings
          break
        default:
          throw new Error("Invalid settings type")
      }

      // Save settings to Supabase
      const { error } = await supabase.from("settings").upsert(
        {
          type: settingType,
          settings: settingsData,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "type",
        },
      )

      if (error) throw error

      toast({
        title: "Settings Saved",
        description: `Your ${settingType} settings have been saved successfully.`,
      })
    } catch (error: any) {
      console.error(`Error saving ${settingType} settings:`, error)
      toast({
        title: "Error",
        description: error.message || `Failed to save ${settingType} settings. Please try again.`,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        </div>

        <Tabs defaultValue="business" className="space-y-4">
          <TabsList>
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span>Business</span>
            </TabsTrigger>
            <TabsTrigger value="tax" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              <span>Tax</span>
            </TabsTrigger>
            <TabsTrigger value="receipt" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span>Receipt</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>System</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                  Update your business details. This information will appear on receipts and invoices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business-name">Business Name</Label>
                    <Input
                      id="business-name"
                      name="name"
                      value={businessInfo.name}
                      onChange={handleBusinessInfoChange}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-email">Email</Label>
                    <Input
                      id="business-email"
                      name="email"
                      type="email"
                      value={businessInfo.email}
                      onChange={handleBusinessInfoChange}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-phone">Phone</Label>
                    <Input
                      id="business-phone"
                      name="phone"
                      value={businessInfo.phone}
                      onChange={handleBusinessInfoChange}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-website">Website</Label>
                    <Input
                      id="business-website"
                      name="website"
                      value={businessInfo.website}
                      onChange={handleBusinessInfoChange}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="business-address">Address</Label>
                    <Textarea
                      id="business-address"
                      name="address"
                      value={businessInfo.address}
                      onChange={handleBusinessInfoChange}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-taxId">Tax ID / VAT Number</Label>
                    <Input
                      id="business-taxId"
                      name="taxId"
                      value={businessInfo.taxId}
                      onChange={handleBusinessInfoChange}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-logo">Logo</Label>
                    <div className="flex items-center gap-2">
                      <img
                        src={businessInfo.logo || "/placeholder.svg"}
                        alt="Business Logo"
                        className="h-10 w-10 rounded-md object-cover"
                      />
                      <Input
                        id="business-logo"
                        name="logo"
                        type="file"
                        accept="image/*"
                        disabled={!isAdmin}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => handleSaveSettings("business")} className="ml-auto" disabled={!isAdmin}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="tax" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tax Settings</CardTitle>
                <CardDescription>Configure tax rates and settings for your business.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-tax"
                    name="enableTax"
                    checked={taxSettings.enableTax}
                    onCheckedChange={(checked) => setTaxSettings((prev) => ({ ...prev, enableTax: checked }))}
                    disabled={!isAdmin}
                  />
                  <Label htmlFor="enable-tax">Enable Tax Calculation</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax-name">Tax Name</Label>
                    <Input
                      id="tax-name"
                      name="taxName"
                      value={taxSettings.taxName}
                      onChange={handleTaxSettingsChange}
                      disabled={!taxSettings.enableTax || !isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                    <Input
                      id="tax-rate"
                      name="taxRate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={taxSettings.taxRate}
                      onChange={handleTaxRateChange}
                      disabled={!taxSettings.enableTax || !isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax-number">Tax Registration Number</Label>
                    <Input
                      id="tax-number"
                      name="taxNumber"
                      value={taxSettings.taxNumber}
                      onChange={handleTaxSettingsChange}
                      disabled={!taxSettings.enableTax || !isAdmin}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="apply-tax-all"
                    name="applyTaxToAll"
                    checked={taxSettings.applyTaxToAll}
                    onCheckedChange={(checked) => setTaxSettings((prev) => ({ ...prev, applyTaxToAll: checked }))}
                    disabled={!taxSettings.enableTax || !isAdmin}
                  />
                  <Label htmlFor="apply-tax-all">Apply tax to all products by default</Label>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => handleSaveSettings("tax")} className="ml-auto" disabled={!isAdmin}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="receipt" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Receipt Settings</CardTitle>
                <CardDescription>Customize how receipts are generated and displayed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="receipt-prefix">Receipt Number Prefix</Label>
                    <Input
                      id="receipt-prefix"
                      name="receiptPrefix"
                      value={receiptSettings.receiptPrefix}
                      onChange={handleReceiptSettingsChange}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receipt-footer">Receipt Footer Text</Label>
                    <Input
                      id="receipt-footer"
                      name="footerText"
                      value={receiptSettings.footerText}
                      onChange={handleReceiptSettingsChange}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-logo"
                      name="showLogo"
                      checked={receiptSettings.showLogo}
                      onCheckedChange={(checked) => setReceiptSettings((prev) => ({ ...prev, showLogo: checked }))}
                      disabled={!isAdmin}
                    />
                    <Label htmlFor="show-logo">Show Business Logo on Receipt</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-tax-details"
                      name="showTaxDetails"
                      checked={receiptSettings.showTaxDetails}
                      onCheckedChange={(checked) =>
                        setReceiptSettings((prev) => ({ ...prev, showTaxDetails: checked }))
                      }
                      disabled={!isAdmin}
                    />
                    <Label htmlFor="show-tax-details">Show Tax Details on Receipt</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="print-automatically"
                      name="printAutomatically"
                      checked={receiptSettings.printAutomatically}
                      onCheckedChange={(checked) =>
                        setReceiptSettings((prev) => ({ ...prev, printAutomatically: checked }))
                      }
                      disabled={!isAdmin}
                    />
                    <Label htmlFor="print-automatically">Print Receipt Automatically</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="email-receipt"
                      name="emailReceipt"
                      checked={receiptSettings.emailReceipt}
                      onCheckedChange={(checked) => setReceiptSettings((prev) => ({ ...prev, emailReceipt: checked }))}
                      disabled={!isAdmin}
                    />
                    <Label htmlFor="email-receipt">Email Receipt to Customer</Label>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => handleSaveSettings("receipt")} className="ml-auto" disabled={!isAdmin}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure general system settings and preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="system-language">Language</Label>
                    <Select
                      value={systemSettings.language}
                      onValueChange={(value) => handleSystemSettingsChange("language", value)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger id="system-language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="system-currency">Currency</Label>
                    <Select
                      value={systemSettings.currency}
                      onValueChange={(value) => handleSystemSettingsChange("currency", value)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger id="system-currency">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                        <SelectItem value="CAD">CAD ($)</SelectItem>
                        <SelectItem value="MAD">MAD (د.م.)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="system-date-format">Date Format</Label>
                    <Select
                      value={systemSettings.dateFormat}
                      onValueChange={(value) => handleSystemSettingsChange("dateFormat", value)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger id="system-date-format">
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="system-time-format">Time Format</Label>
                    <Select
                      value={systemSettings.timeFormat}
                      onValueChange={(value) => handleSystemSettingsChange("timeFormat", value)}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger id="system-time-format">
                        <SelectValue placeholder="Select time format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                        <SelectItem value="24h">24-hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="low-stock-alert"
                        checked={systemSettings.lowStockAlert}
                        onCheckedChange={(checked) => handleSystemSettingsChange("lowStockAlert", checked)}
                        disabled={!isAdmin}
                      />
                      <Label htmlFor="low-stock-alert">Enable Low Stock Alerts</Label>
                    </div>
                    {systemSettings.lowStockAlert && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor="low-stock-threshold" className="text-sm">
                          Threshold:
                        </Label>
                        <Input
                          id="low-stock-threshold"
                          type="number"
                          min="1"
                          className="w-20"
                          value={systemSettings.lowStockThreshold}
                          onChange={(e) =>
                            handleSystemSettingsChange("lowStockThreshold", Number.parseInt(e.target.value) || 5)
                          }
                          disabled={!isAdmin}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-logout"
                        checked={systemSettings.autoLogout}
                        onCheckedChange={(checked) => handleSystemSettingsChange("autoLogout", checked)}
                        disabled={!isAdmin}
                      />
                      <Label htmlFor="auto-logout">Auto Logout After Inactivity</Label>
                    </div>
                    {systemSettings.autoLogout && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor="logout-time" className="text-sm">
                          Minutes:
                        </Label>
                        <Input
                          id="logout-time"
                          type="number"
                          min="1"
                          className="w-20"
                          value={systemSettings.logoutTime}
                          onChange={(e) =>
                            handleSystemSettingsChange("logoutTime", Number.parseInt(e.target.value) || 30)
                          }
                          disabled={!isAdmin}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => handleSaveSettings("system")} className="ml-auto" disabled={!isAdmin}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

