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
  TrendingUp,
  Package,
  BarChart3,
  Sparkles,
  MessageSquare,
  Menu,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "@/hooks/use-toast"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function AiManagementAssistantPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, reload } = useChat({
    api: "/api/chat",
    onError: (error) => {
      console.error("Chat error:", error)
      toast({
        title: "Error",
        description: error.message || "Something went wrong with the AI assistant",
        variant: "destructive",
      })
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
      text: "Show me products sold with zero stock in the last 7 days",
      category: "Inventory",
      color: "bg-red-50 text-red-700 border-red-200",
    },
    {
      icon: <AlertCircle className="h-4 w-4" />,
      text: "Which products are running low on stock?",
      category: "Stock Alert",
      color: "bg-orange-50 text-orange-700 border-orange-200",
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      text: "What are my best-selling products this month?",
      category: "Sales",
      color: "bg-green-50 text-green-700 border-green-200",
    },
    {
      icon: <Package className="h-4 w-4" />,
      text: "Search for products containing 'cajou'",
      category: "Search",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      text: "Show me daily sales analysis for this month",
      category: "Analytics",
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      text: "Calculate profit analysis for the last 30 days",
      category: "Profit",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
  ]

  const quickActions = [
    { label: "Zero Stock", query: "Show products with zero stock" },
    { label: "Low Stock", query: "Which products are low on stock?" },
    { label: "Best Sellers", query: "Top selling products this month" },
    { label: "Profit Analysis", query: "Calculate profit for last 30 days" },
  ]

  const handleQuestionClick = (question: string) => {
    const syntheticEvent = {
      preventDefault: () => {},
    } as React.FormEvent<HTMLFormElement>
    handleInputChange({ target: { value: question } } as any)
    setTimeout(() => handleSubmit(syntheticEvent), 100)
    setIsSidebarOpen(false)
  }

  const SidebarContent = () => (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Bot className="h-6 w-6 text-blue-600" />
        <h2 className="font-semibold text-lg">AI Assistant</h2>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-sm text-gray-600 mb-2">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
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

        <div>
          <h3 className="font-medium text-sm text-gray-600 mb-2">Suggested Questions</h3>
          <div className="space-y-2">
            {suggestedQuestions.slice(0, 4).map((question, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="w-full text-left justify-start h-auto p-2 text-xs"
                onClick={() => handleQuestionClick(question.text)}
              >
                <div className="flex items-start gap-2">
                  {question.icon}
                  <span className="line-clamp-2">{question.text}</span>
                </div>
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
                  <p className="text-sm text-gray-500 hidden sm:block">Mini-market management helper</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="hidden sm:flex items-center gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                Enhanced
              </Badge>
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
                      Get instant insights about your inventory, sales, and business performance. Ask me anything!
                    </p>
                  </div>

                  {/* Mobile Quick Actions */}
                  <div className="w-full max-w-sm space-y-3 lg:hidden">
                    <p className="text-sm font-medium text-gray-700">Quick Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                      {quickActions.map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="text-xs h-9 bg-transparent"
                          onClick={() => handleQuestionClick(action.query)}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Desktop Suggested Questions */}
                  <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-4xl">
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
                            const textContent = m.parts
                              .filter((part) => part.type === "text")
                              .map((part) => part.text)
                              .join("\n")
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

                      {m.parts.map((part, partIndex) => {
                        switch (part.type) {
                          case "text":
                            return (
                              <div key={partIndex} className="text-sm leading-relaxed whitespace-pre-wrap">
                                {part.text}
                              </div>
                            )
                          case "tool-invocation":
                            if (part.toolInvocation.state === "partial-call") {
                              return (
                                <div
                                  key={partIndex}
                                  className="text-xs text-blue-600 bg-blue-50 p-2 rounded-lg mb-2 flex items-center gap-2 border border-blue-200"
                                >
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span className="font-medium">Preparing analysis...</span>
                                </div>
                              )
                            } else if (part.toolInvocation.state === "call") {
                              return (
                                <div
                                  key={partIndex}
                                  className="text-xs text-blue-600 bg-blue-50 p-2 rounded-lg mb-2 flex items-center gap-2 border border-blue-200"
                                >
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span className="font-medium">Analyzing data...</span>
                                </div>
                              )
                            } else if (part.toolInvocation.state === "result") {
                              return (
                                <div
                                  key={partIndex}
                                  className="text-xs text-green-600 bg-green-50 p-2 rounded-lg mb-2 flex items-center gap-2 border border-green-200"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  <span className="font-medium">Analysis complete</span>
                                </div>
                              )
                            }
                            return null
                          default:
                            return null
                        }
                      })}
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
                      <span className="text-sm text-gray-600 font-medium">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <Input
                className="h-12 pr-12 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                value={input}
                placeholder="Ask about inventory, sales, or business insights..."
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
          <p className="text-xs text-gray-500 text-center mt-2">AI can make mistakes. Verify important information.</p>
        </div>
      </div>
    </div>
  )
}
