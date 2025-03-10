"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase-client"
import { getPOSTranslation, type POSTranslationKey } from "@/lib/pos-translations"
import { getAppTranslation as getAppTranslationFunc, type AppTranslationKey } from "@/lib/app-translations"

// Helper function to check if a language is RTL
export function isRTL(language: string): boolean {
  return language.startsWith("ar") || language === "he"
}

// Create a custom event for language changes that works within the same tab
export const LANGUAGE_CHANGE_EVENT = "app:language-change"

// Update the useLanguage hook to include getAppTranslation
export function useLanguage() {
  const [language, setLanguage] = useState<string>("en")
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchLanguage = useCallback(async () => {
    try {
      console.log("Fetching language from Supabase...")
      setIsLoading(true)
      const { data, error } = await supabase.from("settings").select("language").eq("type", "global").single()

      if (error) {
        console.error("Error fetching language setting:", error)
        return
      }

      if (data?.language && typeof data.language === "string") {
        console.log("Language fetched from Supabase:", data.language)
        setLanguage(data.language)
      }
    } catch (error) {
      console.error("Error in fetchLanguage:", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Initial fetch
  useEffect(() => {
    fetchLanguage()

    // Listen for storage events (triggered when settings are updated in other tabs)
    const handleStorageChange = () => {
      console.log("Storage event detected, refetching language")
      fetchLanguage()
    }

    // Listen for our custom event (for same-tab communication)
    const handleLanguageChange = () => {
      console.log("Custom language change event detected, refetching language")
      fetchLanguage()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange)
    }
  }, [fetchLanguage])

  // Apply RTL if needed
  useEffect(() => {
    if (isRTL(language)) {
      document.documentElement.dir = "rtl"
      document.documentElement.classList.add("rtl")
    } else {
      document.documentElement.dir = "ltr"
      document.documentElement.classList.remove("rtl")
    }

    return () => {
      // Reset direction when component unmounts
      document.documentElement.dir = "ltr"
      document.documentElement.classList.remove("rtl")
    }
  }, [language])

  // Add the getTranslation function for POS translations
  const getTranslation = useCallback(
    (key: POSTranslationKey, lang?: string) => {
      return getPOSTranslation(key, lang || language)
    },
    [language],
  )

  // Add the getAppTranslation function for app-wide translations
  const getAppTranslation = useCallback(
    (key: AppTranslationKey, lang?: string) => {
      return getAppTranslationFunc(key, lang || language)
    },
    [language],
  )

  // Function to update language and notify all components
  const updateLanguage = useCallback(
    async (newLanguage: string) => {
      try {
        console.log("Updating language to:", newLanguage)

        // Update in Supabase
        const { error } = await supabase.from("settings").update({ language: newLanguage }).eq("type", "global")

        if (error) {
          console.error("Error updating language in Supabase:", error)
          return false
        }

        // Update local state
        setLanguage(newLanguage)

        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT))

        // Also dispatch storage event for other tabs
        // This is a hack to trigger the storage event in the same tab
        localStorage.setItem("app:language-timestamp", Date.now().toString())

        console.log("Language updated successfully")
        return true
      } catch (error) {
        console.error("Error in updateLanguage:", error)
        return false
      }
    },
    [supabase],
  )

  return {
    language,
    isRTL: isRTL(language),
    isLoading,
    refetch: fetchLanguage,
    getTranslation,
    getAppTranslation,
    updateLanguage,
  }
}

