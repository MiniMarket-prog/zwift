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
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "@/hooks/use-toast"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

export default function AiManagementAssistantPage() {
  const [detailedMode, setDetailedMode] = useState(true)
  const [responseLength, setResponseLength] = useState([75]) // 75% detailed by default
  const [showSettings, setShowSettings] = useState(false)

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, reload } = useChat({
    api: "/api/chat",
    body: {
      detailedMode,
      responseLength: responseLength[0],
    },
    onError: (error) => {
      console.error("Chat error:", error)
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })
      toast({
        title: "Error",
        description: error.message || "Something went wrong with the AI assistant",
        variant: "destructive",
      })
    },
    onFinish: (message) => {
      console.log("Message finished:", message)
    },
    onResponse: (response) => {
      console.log("Response received:", response.status, response.statusText)
      if (!response.ok) {
        console.error("Response not OK:", response)
      }
    },
  })

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    if (error) {
      console.error("AI Chat Error Object:", error)
    }
  }, [error])

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

  const suggestedQuestions = [
    {
      icon: <Package className="h-4 w-4" />,
      text: "Test database connection and show me a detailed system overview",
      category: "System Test",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      icon: <Package className="h-4 w-4" />,
      text: "Show me products sold with zero stock in the last 7 days with detailed analysis and recommendations",
      category: "Inventory Analysis",
      color: "bg-red-50 text-red-700 border-red-200",
    },
    {
      icon: <Package className="h-4 w-4" />,
      text: "Give me a comprehensive business intelligence dashboard for the last 30 days",
      category: "Business Intelligence",
      color: "bg-green-50 text-green-700 border-green-200",
    },
    {
      icon: <Sparkles className="h-4 w-4" />,
      text: "Analyze my supplier performance and provide detailed recommendations for optimization",
      category: "Supplier Analysis",
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      icon: <Zap className="h-4 w-4" />,
      text: "Generate smart reorder suggestions with detailed cost analysis and supplier information",
      category: "Smart Reordering",
      color: "bg-orange-50 text-orange-700 border-orange-200",
    },
  ]

  const quickActions = [
    {
      label: "Detailed System Test",
      query: "Test database connection and provide a comprehensive system status report with recommendations",
    },
    {
      label: "Zero Stock Analysis",
      query: "Show products with zero stock and provide detailed analysis with actionable recommendations",
    },
    {
      label: "Business Dashboard",
      query: "Generate a comprehensive business intelligence dashboard with detailed insights and trends",
    },
    {
      label: "Profit Analysis",
      query: "Calculate detailed profit analysis for the last 30 days with product-level breakdown and recommendations",
    },
    {
      label: "Inventory Health",
      query: "Provide a detailed inventory health report with optimization suggestions and action items",
    },
  ]

  const handleQuestionClick = (question: string) => {
    const enhancedQuestion = detailedMode
      ? `${question}. Please provide a comprehensive, detailed response with specific data, actionable insights, and clear recommendations.`
      : question

    const syntheticEvent = {
      preventDefault: () => {},
    } as React.FormEvent<HTMLFormElement>
    handleInputChange({ target: { value: enhancedQuestion } } as any)
    setTimeout(() => handleSubmit(syntheticEvent), 100)
    setIsSidebarOpen(false)
  }

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    let enhancedInput = input
    if (detailedMode && input.trim()) {
      // Add context for detailed responses
      enhancedInput = `${input}. Please provide a comprehensive, detailed analysis with specific data points, actionable insights, clear recommendations, and step-by-step explanations where applicable.`
    }

    // Temporarily update the input for submission
    handleInputChange({ target: { value: enhancedInput } } as any)
    setTimeout(() => {
      handleSubmit(e)
      // Reset to original input for display
      handleInputChange({ target: { value: input } } as any)
    }, 50)
  }

  // Helper function to safely extract text content from message
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

  const SidebarContent = () => (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Bot className="h-6 w-6 text-blue-600" />
        <h2 className="font-semibold text-lg">AI Assistant</h2>
      </div>

      {/* Settings Section */}
      <div className="space-y-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm text-gray-700">Response Settings</h3>
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
              <Switch id="detailed-mode" checked={detailedMode} onCheckedChange={setDetailedMode} />
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
                <span>Comprehensive</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-sm text-gray-600 mb-2">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-2">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-8 justify-start bg-transparent"
                onClick={() => handleQuestionClick(action.query)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>


      </div>
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
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bot className="h-8 w-8 text-blue-600" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">AI Assistant</h1>
                  <p className="text-sm text-gray-500 hidden sm:block">
                    {detailedMode ? "Detailed Analysis Mode" : "Quick Response Mode"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {detailedMode && (
                <Badge variant="secondary" className="hidden sm:flex items-center gap-1 text-xs">
                  <Sparkles className="h-3 w-3" />
                  Detailed Mode
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {messages.length} msgs
              </Badge>
            </div>
          </div>
        </div>

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
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <Bot className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">Welcome to AI Assistant</h2>
                    <p className="text-gray-600 max-w-md">
                      {detailedMode
                        ? "I'm configured for detailed analysis and comprehensive responses. Ask me anything about your mini-market!"
                        : "I'm ready to help with quick answers. Enable detailed mode for comprehensive analysis."}
                    </p>
                  </div>

                  {/* Desktop Suggested Questions */}
                  <div className="grid grid-cols-1 gap-3 w-full max-w-2xl">
                    {suggestedQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className={cn(
                          "text-left justify-start h-auto p-4 whitespace-normal border-dashed hover:shadow-md transition-all",
                          question.color,
                        )}
                        onClick={() => handleQuestionClick(question.text)}
                      >
                        <div className="flex items-start gap-3 w-full">
                          <div className="flex-shrink-0 mt-0.5">{question.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">
                                {question.category}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium">{question.text}</p>
                          </div>
                        </div>
                      </Button>
                    ))}
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
                        {detailedMode ? "Analyzing data and preparing detailed response..." : "Thinking..."}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleFormSubmit} className="flex gap-2 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <Input
                className="h-12 pr-12 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                value={input}
                placeholder={
                  detailedMode
                    ? "Ask for detailed analysis and comprehensive insights..."
                    : "Ask me anything about your mini-market..."
                }
                onChange={handleInputChange}
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <MessageSquare className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="lg"
              className="h-12 px-6 rounded-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Send message</span>
            </Button>
          </form>
          <p className="text-xs text-gray-500 text-center mt-2">
            {detailedMode
              ? "Detailed mode enabled - I'll provide comprehensive analysis with specific data and recommendations."
              : "Enable detailed mode in settings for comprehensive analysis and insights."}
          </p>
        </div>
      </div>
    </div>
  )
}
