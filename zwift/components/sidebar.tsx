"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import {
  DollarSign,
  ShoppingCart,
  Package,
  User,
  BarChart3,
  Settings,
  Menu,
  Sun,
  Moon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import { useLanguage } from "@/hooks/use-language"
import { useUser } from "@/components/user-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { AppTranslationKey } from "@/lib/app-translations"

export function AppSidebar() {
  const [isMounted, setIsMounted] = useState(false)
  const [unreadAlerts, setUnreadAlerts] = useState(0)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(256) // Default width
  const resizeRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const supabase = createClient()
  const { toast } = useToast()
  const { getAppTranslation } = useLanguage()
  const { user, profile } = useUser()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const fetchUnreadAlerts = useCallback(async () => {
    try {
      const { error: tableError } = await supabase.from("products").select("id").limit(1)

      if (tableError) {
        console.error("Error checking products table:", tableError)
        setUnreadAlerts(0)
        return
      }

      const { data: lowStockData, error } = await supabase.from("products").select("id, stock, min_stock")

      if (error) {
        console.error("Error fetching products:", error)
        setUnreadAlerts(0)
        return
      }

      const lowStockCount =
        lowStockData?.filter(
          (product) =>
            typeof product.stock === "number" &&
            typeof product.min_stock === "number" &&
            product.stock < product.min_stock,
        ).length || 0

      setUnreadAlerts(lowStockCount)
    } catch (error) {
      console.error("Error fetching unread alerts:", error)
      setUnreadAlerts(0)
    }
  }, [supabase])

  useEffect(() => {
    fetchUnreadAlerts()
    // Set up an interval to refresh alerts every minute
    const interval = setInterval(fetchUnreadAlerts, 60000)
    return () => clearInterval(interval)
  }, [fetchUnreadAlerts])

  // Handle sidebar resizing
  useEffect(() => {
    const handleMouseDown = () => {
      isResizing.current = true
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return

      // Calculate new width based on mouse position
      const newWidth = e.clientX

      // Set min and max width constraints
      if (newWidth >= 180 && newWidth <= 400) {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    const resizeHandle = resizeRef.current
    if (resizeHandle) {
      resizeHandle.addEventListener("mousedown", handleMouseDown)
    }

    return () => {
      if (resizeHandle) {
        resizeHandle.removeEventListener("mousedown", handleMouseDown)
      }
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/auth/login")
      toast({
        title: getAppTranslation("logout"),
        description: getAppTranslation("success"),
      })
    } catch (error) {
      console.error("Error logging out:", error)
      toast({
        title: getAppTranslation("error"),
        description: getAppTranslation("error"),
        variant: "destructive",
      })
    }
  }

  // Map the original labels to translation keys
  const navItems = [
    { href: "/dashboard", label: "dashboard" as AppTranslationKey, icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: "/pos", label: "pointOfSale" as AppTranslationKey, icon: <ShoppingCart className="h-5 w-5" /> },
    { href: "/inventory", label: "inventory" as AppTranslationKey, icon: <Package className="h-5 w-5" /> },
    { href: "/expenses", label: "expenses" as AppTranslationKey, icon: <CircleDollarSign className="h-5 w-5" /> },
    { href: "/reports", label: "reports" as AppTranslationKey, icon: <BarChart3 className="h-5 w-5" /> },
    { href: "/sales", label: "sales" as AppTranslationKey, icon: <DollarSign className="h-5 w-5" /> },
    { href: "/users", label: "customers" as AppTranslationKey, icon: <User className="h-5 w-5" /> },
    {
      href: "/alerts",
      label: "alerts" as AppTranslationKey,
      icon: <AlertTriangle className="h-5 w-5" />,
      badge: unreadAlerts > 0 ? unreadAlerts : null,
    },
    { href: "/settings", label: "settings" as AppTranslationKey, icon: <Settings className="h-5 w-5" /> },
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/logo.svg" alt="Logo" />
            <AvatarFallback>ZW</AvatarFallback>
          </Avatar>
          {!isCollapsed && <h1 className="text-lg font-semibold">MiniMarket</h1>}
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="mr-1">
            {isMounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleCollapse} className="md:flex hidden">
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <TooltipProvider>
          {navItems.map((item) => (
            <Tooltip key={item.href} delayDuration={300}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-4 py-2.5 text-sm rounded-md transition-colors relative group",
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                      : "hover:bg-muted",
                  )}
                >
                  <span className="mr-3">{item.icon}</span>
                  {!isCollapsed && <span>{getAppTranslation(item.label)}</span>}
                  {item.badge && (
                    <Badge
                      variant="destructive"
                      className={cn(
                        "ml-auto",
                        isCollapsed && "absolute -right-1 -top-1 h-5 w-5 flex items-center justify-center p-0",
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right">{getAppTranslation(item.label)}</TooltipContent>}
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>

      <div className="p-4 border-t">
        {!isCollapsed && (
          <div className="flex items-center gap-3 mb-4 px-2">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{profile?.full_name || user?.email}</span>
              <span className="text-xs text-muted-foreground">{profile?.role || "User"}</span>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          className={cn(
            "w-full text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20",
            isCollapsed ? "justify-center px-2" : "justify-start",
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="ml-3">{getAppTranslation("logout")}</span>}
        </Button>
      </div>

      {!isCollapsed && (
        <div className="p-4 text-xs text-muted-foreground border-t">
          &copy; {new Date().getFullYear()} Zwift Manager. All rights reserved.
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div
        ref={sidebarRef}
        className="fixed left-0 top-0 z-40 hidden h-screen border-r bg-card md:block transition-all duration-300"
        style={{ width: isCollapsed ? "72px" : `${sidebarWidth}px` }}
      >
        <SidebarContent />
        <div
          ref={resizeRef}
          className="absolute top-0 right-0 h-full w-1 cursor-ew-resize hover:bg-primary/20 active:bg-primary/40"
        />
      </div>

      {/* Mobile sidebar */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="fixed left-4 top-4 z-40">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open sidebar</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Sidebar spacer for desktop */}
      <div
        className="hidden md:block flex-shrink-0 transition-all duration-300"
        style={{ width: isCollapsed ? "72px" : `${sidebarWidth}px` }}
      />
    </>
  )
}

export default AppSidebar

