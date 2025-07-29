"use client"

import type React from "react"
import { useChat } from "ai/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Send,
  Bot,
  User,
  AlertCircle,
  RefreshCw,
  Copy,
  CheckCircle,
  Package,
  Sparkles,
  MessageSquare,
  Menu,
  Settings,
  Zap,
  Clock,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  Search,
  Heart,
  DollarSign,
  Target,
  ChevronRight,
  Flame,
  Activity,
  PieChart,
  Calendar,
  Filter,
  HelpCircle,
  Smartphone,
  X,
  Hash,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"

export default function AiManagementAssistantPage() {
  const [detailedMode, setDetailedMode] = useState(false)
  const [responseLength, setResponseLength] = useState([50])
  const [showSettings, setShowSettings] = useState(false)
  const [rateLimitWarning, setRateLimitWarning] = useState(false)
  const [lastRequestTime, setLastRequestTime] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState("popular")
  const [showMobileHelp, setShowMobileHelp] = useState(false)

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, reload } = useChat({
    api: "/api/chat",
    body: {
      detailedMode,
      responseLength: responseLength[0],
    },
    onError: (error) => {
      console.error("Chat error:", error)

      if (error.message?.includes("rate limit") || error.message?.includes("Rate limit")) {
        setRateLimitWarning(true)
        toast({
          title: "Rate Limit Reached",
          description: "Please wait a moment before sending another message. Consider using quick response mode.",
          variant: "destructive",
        })
        setDetailedMode(false)
        setResponseLength([25])
      } else {
        toast({
          title: "Error",
          description: error.message || "Something went wrong with the AI assistant",
          variant: "destructive",
        })
      }
    },
    onFinish: (message) => {
      setLastRequestTime(Date.now())
      setRateLimitWarning(false)
    },
    onResponse: (response) => {
      if (response.status === 429) {
        setRateLimitWarning(true)
      }
    },
  })

  // Rate limit protection
  const canSendRequest = () => {
    const timeSinceLastRequest = Date.now() - lastRequestTime
    return timeSinceLastRequest > 3000
  }

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(messageId)
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      })
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy message to clipboard",
        variant: "destructive",
      })
    }
  }

  // Enhanced question categories with more examples
  const questionCategories = {
    popular: {
      title: "🔥 Most Popular",
      icon: <Flame className="h-4 w-4" />,
      questions: [
        {
          text: "How many products do we have in total?",
          description: "Get exact product count from database",
          icon: <Hash className="h-4 w-4" />,
          color: "bg-blue-50 text-blue-700 border-blue-200",
        },
        {
          text: "What's my inventory health score?",
          description: "Get overall performance analysis",
          icon: <Heart className="h-4 w-4" />,
          color: "bg-red-50 text-red-700 border-red-200",
        },
        {
          text: "Show me products below minimum stock",
          description: "Critical stock alerts",
          icon: <AlertTriangle className="h-4 w-4" />,
          color: "bg-orange-50 text-orange-700 border-orange-200",
        },
        {
          text: "Give me smart reorder suggestions",
          description: "AI-powered purchasing advice",
          icon: <Sparkles className="h-4 w-4" />,
          color: "bg-purple-50 text-purple-700 border-purple-200",
        },
      ],
    },
    quick: {
      title: "⚡ Quick Checks",
      icon: <Zap className="h-4 w-4" />,
      questions: [
        {
          text: "Do we have Coca Cola in stock?",
          description: "Check specific product",
          icon: <Search className="h-4 w-4" />,
          color: "bg-blue-50 text-blue-700 border-blue-200",
        },
        {
          text: "How many products are out of stock?",
          description: "Quick stock overview",
          icon: <Package className="h-4 w-4" />,
          color: "bg-gray-50 text-gray-700 border-gray-200",
        },
        {
          text: "Test database connection",
          description: "System health check",
          icon: <Activity className="h-4 w-4" />,
          color: "bg-cyan-50 text-cyan-700 border-cyan-200",
        },
        {
          text: "Show me inventory overview",
          description: "General statistics",
          icon: <BarChart3 className="h-4 w-4" />,
          color: "bg-indigo-50 text-indigo-700 border-indigo-200",
        },
      ],
    },
    business: {
      title: "💼 Business Intelligence",
      icon: <PieChart className="h-4 w-4" />,
      questions: [
        {
          text: "Which products have the highest profit margins?",
          description: "Profitability analysis",
          icon: <DollarSign className="h-4 w-4" />,
          color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        },
        {
          text: "Show me slow-moving products from last 30 days",
          description: "Identify dead stock",
          icon: <Clock className="h-4 w-4" />,
          color: "bg-yellow-50 text-yellow-700 border-yellow-200",
        },
        {
          text: "What products were sold with zero stock?",
          description: "Lost sales opportunities",
          icon: <Target className="h-4 w-4" />,
          color: "bg-red-50 text-red-700 border-red-200",
        },
        {
          text: "What are my best-selling products this month?",
          description: "Top performers analysis",
          icon: <TrendingUp className="h-4 w-4" />,
          color: "bg-green-50 text-green-700 border-green-200",
        },
      ],
    },
    advanced: {
      title: "🎯 Advanced Queries",
      icon: <Target className="h-4 w-4" />,
      questions: [
        {
          text: "Smart reorder suggestions with $500 budget",
          description: "Budget-constrained purchasing",
          icon: <ShoppingCart className="h-4 w-4" />,
          color: "bg-green-50 text-green-700 border-green-200",
        },
        {
          text: "Update minimum stock to 10 for products with 0 min_stock",
          description: "Bulk inventory updates",
          icon: <Settings className="h-4 w-4" />,
          color: "bg-blue-50 text-blue-700 border-blue-200",
        },
        {
          text: "Show me high-profit fast-moving products only",
          description: "Filtered reorder suggestions",
          icon: <Filter className="h-4 w-4" />,
          color: "bg-purple-50 text-purple-700 border-purple-200",
        },
        {
          text: "Give me dashboard stats for this month",
          description: "Monthly performance",
          icon: <Calendar className="h-4 w-4" />,
          color: "bg-violet-50 text-violet-700 border-violet-200",
        },
      ],
    },
  }

  const handleQuestionClick = (question: string) => {
    if (!canSendRequest()) {
      toast({
        title: "Please wait",
        description: "Wait a few seconds between requests to avoid rate limits",
        variant: "destructive",
      })
      return
    }

    const syntheticEvent = {
      preventDefault: () => {},
    } as React.FormEvent<HTMLFormElement>

    handleInputChange({ target: { value: question } } as any)
    setTimeout(() => handleSubmit(syntheticEvent), 100)
    setIsSidebarOpen(false)
    setShowMobileHelp(false)
  }

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!canSendRequest()) {
      toast({
        title: "Please wait",
        description: "Wait a few seconds between requests to avoid rate limits",
        variant: "destructive",
      })
      return
    }

    if (!input.trim()) return

    if (input.length > 500 && detailedMode) {
      toast({
        title: "Long request detected",
        description: "Consider using quick response mode for long questions to avoid rate limits",
        variant: "destructive",
      })
    }

    handleSubmit(e)
  }

  const getMessageText = (content: any): string => {
    if (typeof content === "string") {
      return content
    }
    if (Array.isArray(content)) {
      return content
        .map((part: any) => {
          if (typeof part === "string") return part
          if (part && typeof part === "object" && part.type === "text") return part.text || ""
          if (part && typeof part === "object" && part.type === "tool-call")
            return `[Tool: ${part.toolName || "Unknown"}]`
          return ""
        })
        .filter(Boolean)
        .join("\n")
    }
    return ""
  }

  // Mobile help content
  const MobileHelpContent = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">💡 How to Use</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowMobileHelp(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
          <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">Ask Natural Questions</p>
            <p className="text-sm text-blue-700">Just type what you want to know about your inventory</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
          <Sparkles className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <p className="font-medium text-green-900">Use Suggested Questions</p>
            <p className="text-sm text-green-700">Tap any suggestion below to get started quickly</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
          <Settings className="h-5 w-5 text-purple-600 mt-0.5" />
          <div>
            <p className="font-medium text-purple-900">Adjust Settings</p>
            <p className="text-sm text-purple-700">Use quick mode to avoid rate limits</p>
          </div>
        </div>
      </div>
    </div>
  )

  // Enhanced sidebar content
  const SidebarContent = () => (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Bot className="h-6 w-6 text-blue-600" />
        <h2 className="font-semibold text-lg">AI Assistant</h2>
      </div>

      {/* Rate Limit Warning */}
      {rateLimitWarning && (
        <Alert variant="destructive" className="text-xs">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Rate limit active. Using quick response mode recommended.</AlertDescription>
        </Alert>
      )}

      {/* Settings Section */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm text-gray-700">⚙️ Settings</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {showSettings && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="detailed-mode" className="text-sm">
                Detailed Mode
              </Label>
              <Switch
                id="detailed-mode"
                checked={detailedMode}
                onCheckedChange={(checked) => {
                  setDetailedMode(checked)
                  if (checked) {
                    toast({
                      title: "Detailed Mode Enabled",
                      description: "Responses will be more comprehensive but may use more tokens",
                    })
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Response Detail Level</Label>
              <Slider
                value={responseLength}
                onValueChange={setResponseLength}
                max={100}
                min={25}
                step={25}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Brief</span>
                <span>Detailed</span>
                <span>Full</span>
              </div>
            </div>

            <div className="text-xs text-gray-600 p-2 bg-yellow-50 rounded border">
              <Clock className="h-3 w-3 inline mr-1" />
              Higher detail levels may trigger rate limits more quickly
            </div>
          </div>
        )}
      </Card>

      {/* Status Card */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", rateLimitWarning ? "bg-yellow-500" : "bg-green-500")} />
            <span className="text-sm font-medium">{rateLimitWarning ? "Rate Limited" : "Ready"}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {messages.length} msgs
          </Badge>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {rateLimitWarning
            ? "Using optimized quick responses"
            : detailedMode
              ? "Detailed analysis mode active"
              : "Quick response mode active"}
        </p>
      </Card>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 bg-white border-r border-gray-200">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Enhanced Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bot className="h-8 w-8 text-blue-600" />
                  <div
                    className={cn(
                      "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                      rateLimitWarning ? "bg-yellow-500" : "bg-green-500",
                    )}
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">AI Assistant</h1>
                  <p className="text-sm text-gray-500 hidden sm:block">
                    {rateLimitWarning
                      ? "Rate Limited - Quick Mode"
                      : detailedMode
                        ? "Detailed Analysis Mode"
                        : "Quick Response Mode"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setShowMobileHelp(true)}>
                <HelpCircle className="h-4 w-4" />
              </Button>
              {detailedMode && (
                <Badge variant="secondary" className="hidden sm:flex items-center gap-1 text-xs">
                  <Sparkles className="h-3 w-3" />
                  Detailed
                </Badge>
              )}
              {rateLimitWarning && (
                <Badge variant="destructive" className="text-xs">
                  Rate Limited
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Help Sheet */}
        <Sheet open={showMobileHelp} onOpenChange={setShowMobileHelp}>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Mobile Guide
              </SheetTitle>
            </SheetHeader>
            <MobileHelpContent />
          </SheetContent>
        </Sheet>

        {/* Error Alert */}
        {error && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-sm">{error.message}</span>
                <Button variant="outline" size="sm" onClick={() => reload()} className="ml-2 h-7 text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center space-y-6">
                  {/* Welcome Section */}
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <Bot className="h-10 w-10 text-white" />
                    </div>
                    <div
                      className={cn(
                        "absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white",
                        rateLimitWarning ? "bg-yellow-500" : "bg-green-500",
                      )}
                    >
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2 max-w-md">
                    <h2 className="text-2xl font-bold text-gray-900">Welcome to AI Assistant</h2>
                    <p className="text-gray-600">
                      I fetch real data from your database. Ask me anything about your 2600+ products!
                    </p>
                  </div>

                  {/* Enhanced Question Categories */}
                  <div className="w-full max-w-4xl">
                    <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
                      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6">
                        {Object.entries(questionCategories).map(([key, category]) => (
                          <TabsTrigger key={key} value={key} className="text-xs lg:text-sm">
                            {category.icon}
                            <span className="ml-1 hidden sm:inline">{category.title}</span>
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {Object.entries(questionCategories).map(([key, category]) => (
                        <TabsContent key={key} value={key} className="space-y-3">
                          <div className="text-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">{category.title}</h3>
                            <p className="text-sm text-gray-600">
                              {key === "popular" && "Most commonly used queries with real database data"}
                              {key === "quick" && "Fast answers for immediate needs"}
                              {key === "business" && "Deep insights for business decisions"}
                              {key === "advanced" && "Complex operations and analysis"}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {category.questions.map((question, index) => (
                              <Card
                                key={index}
                                className={cn(
                                  "cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] border-dashed",
                                  question.color,
                                  !canSendRequest() && "opacity-50 cursor-not-allowed",
                                )}
                                onClick={() => canSendRequest() && handleQuestionClick(question.text)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">{question.icon}</div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium mb-1">{question.text}</p>
                                      <p className="text-xs opacity-75">{question.description}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 opacity-50" />
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>

                  {/* Quick Tips for Mobile */}
                  <div className="lg:hidden w-full max-w-md">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Smartphone className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Mobile Tips</span>
                        </div>
                        <ul className="text-xs text-blue-800 space-y-1">
                          <li>• Tap questions above to try them</li>
                          <li>• I always use real database data</li>
                          <li>• Use voice input for easier typing</li>
                          <li>• Enable quick mode to avoid limits</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn("flex items-start gap-3 group", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {m.role === "assistant" && (
                      <Avatar className="mt-1 ring-2 ring-blue-100 flex-shrink-0">
                        <AvatarImage src="/placeholder.svg?height=32&width=32" />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] sm:max-w-[75%] p-3 sm:p-4 rounded-2xl relative shadow-sm",
                        m.role === "user"
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-white text-gray-800 rounded-bl-md border border-gray-200",
                      )}
                    >
                      {m.role === "assistant" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-gray-100"
                          onClick={() => {
                            const textContent = getMessageText(m.content)
                            copyToClipboard(textContent, m.id)
                          }}
                        >
                          {copiedMessageId === m.id ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{getMessageText(m.content)}</div>
                    </div>
                    {m.role === "user" && (
                      <Avatar className="mt-1 ring-2 ring-gray-100 flex-shrink-0">
                        <AvatarImage src="/placeholder.svg?height=32&width=32" />
                        <AvatarFallback className="bg-gray-100 text-gray-600">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))
              )}
              {isLoading && messages.length > 0 && (
                <div className="flex items-start gap-3">
                  <Avatar className="ring-2 ring-blue-100 flex-shrink-0">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="max-w-[75%] p-4 rounded-2xl bg-white text-gray-800 rounded-bl-md border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-sm text-gray-600 font-medium">
                        {detailedMode ? "Analyzing real database data..." : "Fetching data..."}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Enhanced Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleFormSubmit} className="flex gap-2 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <Input
                className="h-12 pr-12 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                value={input}
                placeholder={
                  rateLimitWarning
                    ? "Rate limited - keep questions short..."
                    : detailedMode
                      ? "Ask for detailed analysis of your 2600+ products..."
                      : "Ask me anything about your inventory..."
                }
                onChange={handleInputChange}
                disabled={isLoading}
                maxLength={rateLimitWarning ? 200 : 1000}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <MessageSquare className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading || !input.trim() || !canSendRequest()}
              size="lg"
              className="h-12 px-6 rounded-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Send message</span>
            </Button>
          </form>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              {rateLimitWarning
                ? "Rate limit active - using optimized quick responses with real data"
                : detailedMode
                  ? "Detailed mode - comprehensive analysis with real database data"
                  : "Quick mode - fast responses with real database data"}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>
                {input.length}/{rateLimitWarning ? 200 : 1000}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
