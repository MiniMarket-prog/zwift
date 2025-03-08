"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Save } from "lucide-react"
import type { Database } from "@/types/supabase"

// Define the form data type
type SettingsFormData = {
  tax_rate: string
  store_name: string
  currency: string
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [formData, setFormData] = useState<SettingsFormData>({
    tax_rate: "0",
    store_name: "My Store",
    currency: "USD",
  })
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true)
      try {
        const { data, error } = await supabase.from("settings").select("*").single()

        if (error) {
          if (error.code === "PGRST116") {
            // No settings found, we'll use defaults
            console.log("No settings found, using defaults")
          } else {
            throw error
          }
        }

        if (data) {
          // Update form data
          setFormData({
            tax_rate: data.tax_rate.toString(),
            store_name: data.store_name,
            currency: data.currency,
          })
        }
      } catch (error) {
        console.error("Error fetching settings:", error)
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [supabase, toast])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Save settings
  const saveSettings = async () => {
    setIsSaving(true)
    try {
      // Convert form data to the correct types
      const updatedSettings = {
        tax_rate: Number.parseFloat(formData.tax_rate) || 0,
        store_name: formData.store_name,
        currency: formData.currency,
      }

      // Check if settings already exist
      const { data: existingSettings, error: checkError } = await supabase.from("settings").select("id").single()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      let result
      if (existingSettings) {
        // Update existing settings
        result = await supabase.from("settings").update(updatedSettings).eq("id", existingSettings.id).select()
      } else {
        // Insert new settings
        result = await supabase.from("settings").insert(updatedSettings).select()
      }

      if (result.error) throw result.error

      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your store settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure your store&apos;s basic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="store_name">Store Name</Label>
                    <Input id="store_name" name="store_name" value={formData.store_name} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      placeholder="USD"
                    />
                    <p className="text-sm text-muted-foreground">Currency code (e.g., USD, EUR, GBP)</p>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={saveSettings} disabled={isLoading || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <CardTitle>Tax Settings</CardTitle>
              <CardDescription>Configure tax rates for your store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    name="tax_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tax_rate}
                    onChange={handleInputChange}
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the tax rate as a percentage (e.g., 7.5 for 7.5%)
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={saveSettings} disabled={isLoading || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>Configure payment methods and options</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground py-8 text-center">
                Payment settings will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

