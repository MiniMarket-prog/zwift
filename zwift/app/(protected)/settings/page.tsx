"use client"
export const dynamic = "force-dynamic"
import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Check, AlertCircle } from "lucide-react"
import type { Json } from "@/types/supabase"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/format-currency"
import { isRTL } from "@/lib/language-utils"
import { useLanguage } from "@/hooks/use-language"

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

  // State for confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()
  const { getAppTranslation, language } = useLanguage()
  const rtlEnabled = isRTL(formValues.language)

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
        title: getAppTranslation("success", language),
        description: getAppTranslation("settings_saved_successfully", language),
      })

      // Show confirmation dialog
      setSaveSuccess(true)
      setShowConfirmation(true)
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: getAppTranslation("error", language),
        description: getAppTranslation("error_saving_settings", language),
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

  useEffect(() => {
    document.documentElement.dir = rtlEnabled ? "rtl" : "ltr"

    // Add a class to help with RTL-specific styling if needed
    if (rtlEnabled) {
      document.documentElement.classList.add("rtl")
    } else {
      document.documentElement.classList.remove("rtl")
    }

    return () => {
      // Clean up when component unmounts
      if (document.documentElement.dir === "rtl") {
        document.documentElement.dir = "ltr"
        document.documentElement.classList.remove("rtl")
      }
    }
  }, [formValues.language, rtlEnabled])

  // Simple preview to show how currency and text direction changes affect the display
  const previewAmount = 1234.56
  const formattedCurrency = formatCurrency(previewAmount, formValues.currency, formValues.language)

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>{getAppTranslation("settings", language)}</CardTitle>
          <CardDescription>{getAppTranslation("manage_store_settings", language)}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store_name">{getAppTranslation("name", language)}</Label>
              <Input
                id="store_name"
                name="store_name"
                value={formValues.store_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_rate">{getAppTranslation("tax_rate", language)} (%)</Label>
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
              <Label htmlFor="currency">{getAppTranslation("currency", language)}</Label>
              <Select value={formValues.currency} onValueChange={(value) => handleSelectChange("currency", value)}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder={getAppTranslation("select_currency", language)} />
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
              <Label htmlFor="language">{getAppTranslation("language", language)}</Label>
              <Select value={formValues.language} onValueChange={(value) => handleSelectChange("language", value)}>
                <SelectTrigger id="language">
                  <SelectValue placeholder={getAppTranslation("select_language", language)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish (Español)</SelectItem>
                  <SelectItem value="fr">French (Français)</SelectItem>
                  <SelectItem value="de">German (Deutsch)</SelectItem>
                  <SelectItem value="it">Italian (Italiano)</SelectItem>
                  <SelectItem value="pt">Portuguese (Português)</SelectItem>
                  <SelectItem value="ru">Russian (Русский)</SelectItem>
                  <SelectItem value="zh">Chinese (中文)</SelectItem>
                  <SelectItem value="ja">Japanese (日本語)</SelectItem>
                  <SelectItem value="ar">Arabic (العربية)</SelectItem>
                  <SelectItem value="ar-sa">Arabic - Saudi (العربية السعودية)</SelectItem>
                  <SelectItem value="ar-eg">Arabic - Egyptian (العربية المصرية)</SelectItem>
                  <SelectItem value="ar-ma">Arabic - Moroccan (العربية المغربية)</SelectItem>
                  <SelectItem value="ar-ae">Arabic - UAE (العربية الإماراتية)</SelectItem>
                  <SelectItem value="he">Hebrew (עברית)</SelectItem>
                  <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                  <SelectItem value="tr">Turkish (Türkçe)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview section to show formatting changes */}
            <div className="mt-6 p-4 border rounded-md bg-muted/30">
              <h3 className="text-sm font-medium mb-2">{getAppTranslation("preview", language)}:</h3>
              <p className={`text-sm ${rtlEnabled ? "text-right" : "text-left"}`}>
                {rtlEnabled ? getAppTranslation("my_store", language) : getAppTranslation("my_store", language)}:{" "}
                {formValues.store_name}
              </p>
              <p className={`text-sm ${rtlEnabled ? "text-right" : "text-left"}`}>
                {rtlEnabled ? getAppTranslation("amount", language) : getAppTranslation("amount", language)}:{" "}
                {formattedCurrency}
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getAppTranslation("saving", language)}...
                </>
              ) : (
                getAppTranslation("save_settings", language)
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {saveSuccess
                ? getAppTranslation("settings_saved", language)
                : getAppTranslation("error_saving_settings", language)}
            </DialogTitle>
          </DialogHeader>

          {/* Dialog content */}
          {saveSuccess ? (
            <div className="flex flex-col items-center py-4">
              <div className="rounded-full bg-green-100 p-3 mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p>{getAppTranslation("settings_saved_successfully", language)}</p>
              <p className="text-sm text-muted-foreground mt-2">{getAppTranslation("changes_take_effect", language)}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <div className="rounded-full bg-red-100 p-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <p>{getAppTranslation("error_saving_settings_try_again", language)}</p>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowConfirmation(false)}>{getAppTranslation("close", language)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

