"use client"

import { useChat } from "ai/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react" // Import Loader2
import { useEffect } from "react"

export default function AiManagementAssistantPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat", // This is our new API route
  })

  useEffect(() => {
    if (error) {
      console.error("AI Chat Error Object:", error)
    }
  }, [error])

  return (
    <div className="container py-10 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8 text-blue-600" />
            AI Management Assistant
          </h1>
          <p className="text-muted-foreground mt-1">
            Ask questions to get smart insights and advice for your mini-market.
          </p>
        </div>
      </div>

      <Card className="h-[70vh] flex flex-col">
        <CardHeader>
          <CardTitle>Chat with your AI Assistant</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-4">
          <ScrollArea className="flex-1 pr-4 mb-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                <Bot className="h-12 w-12 mb-4 text-blue-400" />
                <p className="text-lg">How can I help you manage your mini-market today?</p>
                <p className="text-sm mt-2">
                  Try asking: "Which products are selling the most this month?" or "How can I improve inventory
                  turnover?"
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex items-start gap-3 mb-4", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  {m.role === "assistant" && (
                    <Avatar>
                      <AvatarImage src="/placeholder.svg?height=32&width=32" />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[70%] p-3 rounded-lg",
                      m.role === "user"
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-gray-100 text-gray-800 rounded-bl-none",
                    )}
                  >
                    {m.parts.map((part, partIndex) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <p key={partIndex} className="text-sm whitespace-pre-wrap">
                              {part.text}
                            </p>
                          )
                        // Add more cases here for other part types if needed in the future
                        // case "tool-invocation":
                        //   return <div key={partIndex}>Calling tool: {part.toolInvocation.toolName}</div>;
                        // case "tool-result":
                        //   return <div key={partIndex}>Tool result: {JSON.stringify(part.toolResult)}</div>;
                        case "step-start":
                          return (
                            <div key={partIndex} className="text-sm text-muted-foreground italic mt-2 mb-1">
                              [Starting AI step...]
                            </div>
                          )
                        default:
                          // Fallback for unknown or unexpected part types
                          return (
                            <p key={partIndex} className="text-sm whitespace-pre-wrap text-red-400">
                              [Unsupported content type: {part.type}]
                            </p>
                          )
                      }
                    })}
                  </div>
                  {m.role === "user" && (
                    <Avatar>
                      <AvatarImage src="/placeholder.svg?height=32&width=32" />
                      <AvatarFallback>You</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            {isLoading && messages.length > 0 && (
              <div className="flex items-start gap-3 mb-4">
                <Avatar>
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="max-w-[70%] p-3 rounded-lg bg-gray-100 text-gray-800 rounded-bl-none">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                </div>
              </div>
            )}
            {error && <div className="text-red-500 text-sm mt-4">Error: {error.message}</div>}
          </ScrollArea>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              className="flex-1"
              value={input}
              placeholder="Ask your AI assistant..."
              onChange={handleInputChange}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
