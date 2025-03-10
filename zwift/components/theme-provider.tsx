"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  enableSystem?: boolean
  attribute?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
  attribute = "class",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [mounted, setMounted] = useState(false)
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)")

  // Update theme when mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const root = window.document.documentElement

    // Remove all theme-related classes first
    root.classList.remove("light", "dark")

    // Remove any color-scheme style
    root.style.colorScheme = ""

    if (theme === "system" && enableSystem) {
      const systemTheme = prefersDark ? "dark" : "light"

      if (attribute === "class") {
        root.classList.add(systemTheme)
      } else {
        root.setAttribute(attribute, systemTheme)
      }

      // Set color-scheme
      root.style.colorScheme = systemTheme
    } else {
      if (attribute === "class") {
        root.classList.add(theme)
      } else {
        root.setAttribute(attribute, theme)
      }

      // Set color-scheme
      root.style.colorScheme = theme
    }
  }, [theme, attribute, enableSystem, prefersDark])

  // Prevent hydration mismatch by only rendering children when mounted
  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>
  }

  return (
    <ThemeProviderContext.Provider
      value={{
        theme,
        setTheme,
      }}
    >
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider")

  return context
}

