"use server"

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database, Json } from "@/types/supabase"
import type { SupportedCurrency } from "@/lib/format-currency"

export async function updateCurrency(currency: SupportedCurrency) {
  console.log("Server action: updateCurrency called with", currency)
  const supabase = createServerComponentClient<Database>({ cookies })

  try {
    // First check if settings exist - select all fields we need
    const { data: existingSettings, error: fetchError } = await supabase
      .from("settings")
      .select("*")
      .eq("type", "global")
      .maybeSingle()

    console.log("Existing settings:", existingSettings, "Error:", fetchError)

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError
    }

    // Create a properly typed settings object
    let settingsObject: Json = { theme: "light", notifications: true }

    // If we have existing settings, use them as a base
    if (
      existingSettings?.settings &&
      typeof existingSettings.settings === "object" &&
      existingSettings.settings !== null
    ) {
      settingsObject = {
        ...existingSettings.settings,
        currency, // Update the currency in the settings object
      }
    } else {
      // Otherwise create a new settings object with the currency
      settingsObject = {
        theme: "light",
        notifications: true,
        currency,
      }
    }

    console.log("Upserting settings with:", {
      id: existingSettings?.id,
      type: "global",
      settings: settingsObject,
      store_name: existingSettings?.store_name || "My Store",
      tax_rate: existingSettings?.tax_rate || 0,
      language: existingSettings?.language || "en",
      currency, // Also update the top-level currency field
    })

    // Update or insert settings
    const { data, error: upsertError } = await supabase
      .from("settings")
      .upsert({
        id: existingSettings?.id,
        type: "global",
        settings: settingsObject,
        store_name: existingSettings?.store_name || "My Store",
        tax_rate: existingSettings?.tax_rate || 0,
        language: existingSettings?.language || "en",
        currency, // Also update the top-level currency field
      })
      .select()

    console.log("Upsert result:", data, "Error:", upsertError)

    if (upsertError) {
      throw upsertError
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating currency:", error)
    return { success: false, error }
  }
}

