"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import {
  DollarSign,
  ShoppingCart,
  Calculator,
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
  Activity,
  LineChart,
  TrendingUp,
  ClipboardList,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export function AppSidebar() {
  const [isMounted, setIsMounted] = useState(false)
  const [unreadAlerts, setUnreadAlerts] = useState(0)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(256) // Default width
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
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

  // Function to handle translation fallbacks
  const getTranslation = (key: AppTranslationKey | string) => {
    // Try to get the translation
    const translation = getAppTranslation(key as AppTranslationKey)

    // If translation is empty or the same as the key (indicating no translation found)
    if (!translation || translation === key) {
      // Return a formatted version of the key as fallback
      return key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .replace(/([a-z])([A-Z])/g, "$1 $2")
    }

    return translation
  }

  useEffect(() => {
    setIsMounted(true)

    // Check if we should open any submenus based on current path
    if (pathname.startsWith("/reports/")) {
      setOpenSubmenu("reports")
    }
  }, [pathname])

  const fetchUnreadAlerts = useCallback(async () => {
    try {
      console.log("Fetching unread alerts...")
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

      const lowStockProducts =
        lowStockData?.filter(
          (product) =>
            typeof product.stock === "number" &&
            typeof product.min_stock === "number" &&
            product.stock < product.min_stock,
        ) || []

      const lowStockCount = lowStockProducts.length

      console.log(
        `Found ${lowStockCount} products with low stock:`,
        lowStockProducts.map((p) => `ID: ${p.id}, Stock: ${p.stock}, Min Stock: ${p.min_stock}`),
      )

      setUnreadAlerts(lowStockCount)
    } catch (error) {
      console.error("Error fetching unread alerts:", error)
      setUnreadAlerts(0)
    }
  }, [supabase])

  useEffect(() => {
    console.log("Setting up alerts polling")
    fetchUnreadAlerts()
    // Set up an interval to refresh alerts every minute
    const interval = setInterval(fetchUnreadAlerts, 60000)
    return () => {
      console.log("Cleaning up alerts polling")
      clearInterval(interval)
    }
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

  const toggleSubmenu = (key: string) => {
    setOpenSubmenu(openSubmenu === key ? null : key)
  }

  // Map the original labels to translation keys
  const navItems = [
    { href: "/dashboard", label: "dashboard" as AppTranslationKey, icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: "/pos", label: "pointOfSale" as AppTranslationKey, icon: <ShoppingCart className="h-5 w-5" /> },
    { href: "/alerts", label: "alerts" as AppTranslationKey, icon: <AlertTriangle className="h-5 w-5" />, badge: unreadAlerts > 0 ? unreadAlerts : null, },
    { href: "/sales", label: "sales" as AppTranslationKey, icon: <DollarSign className="h-5 w-5" /> },
    { href: "/products", label: "inventory" as AppTranslationKey, icon: <Package className="h-5 w-5" /> },
    { href: "/reports", label: "reports" as AppTranslationKey, icon: <BarChart3 className="h-5 w-5" /> },
    { href: "/forecasting", label: "forecasting" as AppTranslationKey, icon: <TrendingUp className="h-5 w-5" />, },
    { href: "/purchase-orders", label: "purchaseOrders" as AppTranslationKey, icon: <ClipboardList className="h-5 w-5" />, },
    { href: "/expenses", label: "expenses" as AppTranslationKey, icon: <CircleDollarSign className="h-5 w-5" /> },    
    { href: "/reports", label: "Analyses" as AppTranslationKey, icon: <BarChart3 className="h-5 w-5" />, hasSubmenu: true, key: "reports",
      submenu: [
        {
          href: "/reports/activity",
          label: "Activity Reports",
          icon: <Activity className="h-4 w-4" />,
        },
        {
          href: "/reports/sales",
          label: "Sales Reports",
          icon: <LineChart className="h-4 w-4" />,
        },
      ],
    }, 
    { href: "/capital-analytics", label: "capital-analytics" as AppTranslationKey, icon: <Calculator className="h-5 w-5" /> },   
    { href: "/users", label: "customers" as AppTranslationKey, icon: <User className="h-5 w-5" /> },    
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
            <div key={item.href}>
              {item.hasSubmenu ? (
                <Collapsible
                  open={openSubmenu === item.key && !isCollapsed}
                  onOpenChange={() => !isCollapsed && toggleSubmenu(item.key!)}
                >
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <CollapsibleTrigger asChild>
                        <div
                          className={cn(
                            "flex items-center px-4 py-2.5 text-sm rounded-md transition-colors relative group cursor-pointer",
                            pathname === item.href || pathname.startsWith(item.href + "/")
                              ? "bg-primary text-primary-foreground font-medium shadow-sm"
                              : "hover:bg-muted",
                          )}
                        >
                          <span className="mr-3">{item.icon}</span>
                          {!isCollapsed && (
                            <>
                              <span>{getTranslation(item.label)}</span>
                              <ChevronRight
                                className={cn(
                                  "h-4 w-4 ml-auto transition-transform",
                                  openSubmenu === item.key && "transform rotate-90",
                                )}
                              />
                            </>
                          )}
                        </div>
                      </CollapsibleTrigger>
                    </TooltipTrigger>
                    {isCollapsed && <TooltipContent side="right">{getTranslation(item.label)}</TooltipContent>}
                  </Tooltip>

                  <CollapsibleContent className="pl-9 space-y-1 mt-1">
                    {item.submenu?.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          "flex items-center px-4 py-2 text-sm rounded-md transition-colors",
                          pathname === subItem.href
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span className="mr-3">{subItem.icon}</span>
                        <span>{subItem.label}</span>
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <Tooltip delayDuration={300}>
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
                      {!isCollapsed && <span>{getTranslation(item.label)}</span>}
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
                  {isCollapsed && <TooltipContent side="right">{getTranslation(item.label)}</TooltipContent>}
                </Tooltip>
              )}
            </div>
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
          {!isCollapsed && <span className="ml-3">{getTranslation("logout")}</span>}
        </Button>
      </div>

      {!isCollapsed && (
        <div className="p-4 text-xs text-muted-foreground border-t">
          &copy; {new Date().getFullYear()} Created By Mohamed El Alami
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

