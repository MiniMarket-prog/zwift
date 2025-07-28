"use client"

import type React from "react"

import { useChat } from "ai/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "@/hooks/use-toast"

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
    },
    {
      icon: <AlertCircle className="h-4 w-4" />,
      text: "Which products are running low on stock?",
      category: "Stock Alert",
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      text: "What are my best-selling products this month?",
      category: "Sales",
    },
    {
      icon: <Package className="h-4 w-4" />,
      text: "Search for products containing 'cajou'",
      category: "Search",
    },
    {
      icon: <BarChart3 className="h-4 w-4" />,
      text: "Show me daily sales analysis for this month",
      category: "Analytics",
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      text: "Calculate profit analysis for the last 30 days",
      category: "Profit",
    },
  ]

  return (
    <div className="container py-10 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8 text-blue-600" />
            Enhanced AI Management Assistant
          </h1>
          <p className="text-muted-foreground mt-1">
            Ask questions to get smart insights and advice for your mini-market with comprehensive analysis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            AI Assistant Active
          </Badge>
          <Badge variant="outline">{messages.length} messages</Badge>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error.message}</span>
            <Button variant="outline" size="sm" onClick={() => reload()} className="ml-2">
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="h-[75vh] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Chat with your AI Assistant
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                GPT-4o Mini
              </Badge>
              <Badge variant="outline" className="text-xs">
                Enhanced Tools
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-4">
          <ScrollArea className="flex-1 pr-4 mb-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center space-y-6">
                <div className="relative">
                  <Bot className="h-20 w-20 mb-4 text-blue-400" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-semibold mb-2">How can I help you manage your mini-market today?</p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    I can help you analyze inventory, track sales, find products with zero stock, calculate profits, and
                    provide comprehensive business insights with barcodes and detailed information.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-4xl">
                  {suggestedQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-left justify-start h-auto p-4 whitespace-normal bg-transparent hover:bg-gray-50 border-dashed"
                      onClick={() => {
                        const syntheticEvent = {
                          preventDefault: () => {},
                        } as React.FormEvent<HTMLFormElement>
                        handleInputChange({ target: { value: question.text } } as any)
                        setTimeout(() => handleSubmit(syntheticEvent), 100)
                      }}
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
                  className={cn(
                    "flex items-start gap-3 mb-6 group",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {m.role === "assistant" && (
                    <Avatar className="mt-1 ring-2 ring-blue-100">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] p-4 rounded-lg relative shadow-sm",
                      m.role === "user"
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-gray-50 text-gray-800 rounded-bl-none border border-gray-200",
                    )}
                  >
                    {m.role === "assistant" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-gray-200"
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
                            <div key={partIndex} className="text-sm whitespace-pre-wrap leading-relaxed">
                              {part.text}
                            </div>
                          )
                        case "tool-invocation":
                          if (part.toolInvocation.state === "partial-call") {
                            return (
                              <div
                                key={partIndex}
                                className="text-xs text-blue-600 bg-blue-50 p-3 rounded-md mb-2 flex items-center gap-2 border border-blue-200"
                              >
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span className="font-medium">Preparing {part.toolInvocation.toolName}...</span>
                              </div>
                            )
                          } else if (part.toolInvocation.state === "call") {
                            return (
                              <div
                                key={partIndex}
                                className="text-xs text-blue-600 bg-blue-50 p-3 rounded-md mb-2 flex items-center gap-2 border border-blue-200"
                              >
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span className="font-medium">Analyzing {part.toolInvocation.toolName}...</span>
                              </div>
                            )
                          } else if (part.toolInvocation.state === "result") {
                            return (
                              <div
                                key={partIndex}
                                className="text-xs text-green-600 bg-green-50 p-3 rounded-md mb-2 flex items-center gap-2 border border-green-200"
                              >
                                <CheckCircle className="h-3 w-3" />
                                <span className="font-medium">Data retrieved successfully</span>
                              </div>
                            )
                          }
                          return null
                        case "step-start":
                          return (
                            <div
                              key={partIndex}
                              className="text-sm text-muted-foreground italic mt-2 mb-1 flex items-center gap-2 bg-gray-100 p-2 rounded"
                            >
                              <Loader2 className="h-3 w-3 animate-spin" />
                              [Starting analysis...]
                            </div>
                          )
                        default:
                          return (
                            <p
                              key={partIndex}
                              className="text-sm whitespace-pre-wrap text-red-400 bg-red-50 p-2 rounded"
                            >
                              [Unsupported content type: {part.type}]
                            </p>
                          )
                      }
                    })}
                  </div>
                  {m.role === "user" && (
                    <Avatar className="mt-1 ring-2 ring-gray-100">
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
              <div className="flex items-start gap-3 mb-4">
                <Avatar className="ring-2 ring-blue-100">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-[70%] p-4 rounded-lg bg-gray-50 text-gray-800 rounded-bl-none border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm text-muted-foreground font-medium">AI is analyzing your request...</span>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              className="flex-1 h-12"
              value={input}
              placeholder="Ask your AI assistant about inventory, sales, products with zero stock, or business analytics..."
              onChange={handleInputChange}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="lg" className="px-6">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
