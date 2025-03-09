"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Check } from "lucide-react"
import type { Database } from "@/types/supabase"
import type { Json } from "@/types/supabase"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Define a type for the settings object that matches the database schema
type SettingsType = {
  id: string | null
  type: string
  settings: Json
  store_name: string
  tax_rate: number
  currency: string
  language: string
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<SettingsType>({
    id: null,
    type: "global",
    settings: { theme: "light", notifications: true },
    store_name: "My Store",
    tax_rate: 0,
    currency: "USD",
    language: "en",
  })

  // State for form values
  const [formValues, setFormValues] = useState({
    store_name: settings.store_name,
    tax_rate: settings.tax_rate,
    currency: settings.currency,
    language: settings.language,
  })

  // Add state for confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()

  // Fetch settings on component mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        // Filter for global settings
        const { data, error } = await supabase.from("settings").select("*").eq("type", "global").maybeSingle()

        if (error) {
          console.error("Error fetching settings:", error)
          console.log("No settings found, using defaults")
          return
        }

        if (data) {
          console.log("Settings loaded:", data)
          const settingsData = data as SettingsType
          setSettings(settingsData)

          // Update form values when settings are loaded
          setFormValues({
            store_name: settingsData.store_name,
            tax_rate: settingsData.tax_rate,
            currency: settingsData.currency,
            language: settingsData.language,
          })
        }
      } catch (error) {
        console.error("Error fetching settings:", error)
      }
    }

    fetchSettings()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("Saving settings:", formValues)

      // Default settings object that matches the Json type
      const defaultSettings: Json = { theme: "light", notifications: true }

      // Make sure settings.settings is an object before trying to access properties
      let currentSettings =
        typeof settings.settings === "object" && settings.settings !== null ? settings.settings : defaultSettings

      // Update the settings object with the new values
      if (typeof currentSettings === "object" && currentSettings !== null) {
        currentSettings = {
          ...currentSettings,
          currency: formValues.currency,
          taxRate: formValues.tax_rate,
        }
      }

      // Include all required fields including the settings JSONB field
      const { data, error } = await supabase
        .from("settings")
        .upsert({
          id: settings.id || undefined,
          type: "global",
          settings: currentSettings,
          store_name: formValues.store_name,
          tax_rate: formValues.tax_rate,
          currency: formValues.currency,
          language: formValues.language,
        })
        .select()

      if (error) {
        throw error
      }

      console.log("Settings saved successfully:", data)

      // Update the local state with the new values
      if (data && data.length > 0) {
        const updatedSettings = data[0] as SettingsType
        setSettings(updatedSettings)

        // Also update form values
        setFormValues({
          store_name: updatedSettings.store_name,
          tax_rate: updatedSettings.tax_rate,
          currency: updatedSettings.currency,
          language: updatedSettings.language,
        })
      }

      // After saving settings, trigger a refresh of any components that use the settings
      window.dispatchEvent(new Event("storage"))

      // Show success toast
      toast({
        title: "Settings saved",
        description: "Your settings have been saved successfully.",
      })

      // Show confirmation dialog
      setSaveSuccess(true)
      setShowConfirmation(true)
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "There was an error saving your settings.",
        variant: "destructive",
      })

      // Show error confirmation dialog
      setSaveSuccess(false)
      setShowConfirmation(true)
    } finally {
      setLoading(false)
    }
  }

  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormValues((prev) => ({
      ...prev,
      [name]: name === "tax_rate" ? Number.parseFloat(value) : value,
    }))
  }

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Manage your store settings</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store_name">Store Name</Label>
              <Input
                id="store_name"
                name="store_name"
                value={formValues.store_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                name="tax_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formValues.tax_rate}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={formValues.currency} onValueChange={(value) => handleSelectChange("currency", value)}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="CNY">CNY (¥)</SelectItem>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="MAD">MAD (DH)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={formValues.language} onValueChange={(value) => handleSelectChange("language", value)}>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{saveSuccess ? "Settings Saved" : "Error Saving Settings"}</DialogTitle>
          </DialogHeader>

          {/* Move content outside of DialogDescription to avoid nesting divs in p tags */}
          {saveSuccess ? (
            <div className="flex flex-col items-center py-4">
              <div className="rounded-full bg-green-100 p-3 mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p>Your settings have been saved successfully.</p>
              <p className="text-sm text-muted-foreground mt-2">The changes will take effect immediately.</p>
            </div>
          ) : (
            <div className="py-4">
              <p>There was an error saving your settings. Please try again.</p>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowConfirmation(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

