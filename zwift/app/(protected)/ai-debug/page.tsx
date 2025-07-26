"use client"

import { useChat } from "ai/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bug, Loader2 } from "lucide-react"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export default function AiDebugPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat", // Ensure this points to your chat API route
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages or loading state change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading])

  return (
    <div className="container py-10 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bug className="h-8 w-8 text-red-600" />
            AI Debug Page
          </h1>
          <p className="text-muted-foreground mt-1">
            This page helps debug the AI chat assistant by displaying raw message data and errors.
          </p>
        </div>
      </div>

      <Card className="h-[80vh] flex flex-col">
        <CardHeader>
          <CardTitle>AI Chat Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-4">
          <ScrollArea className="flex-1 pr-4 mb-4 border rounded-md p-2 bg-gray-50 text-sm font-mono">
            <h3 className="font-semibold text-base mb-2">Current Messages (from useChat hook):</h3>
            <pre className="whitespace-pre-wrap break-all">{JSON.stringify(messages, null, 2)}</pre>
            <h3 className="font-semibold text-base mt-4 mb-2">Current Input:</h3>
            <pre className="whitespace-pre-wrap break-all">{JSON.stringify(input, null, 2)}</pre>
            <h3 className="font-semibold text-base mt-4 mb-2">Is Loading:</h3>
            <pre className="whitespace-pre-wrap break-all">{JSON.stringify(isLoading, null, 2)}</pre>
            <h3 className="font-semibold text-base mt-4 mb-2">Error Object:</h3>
            {error ? (
              <pre className="whitespace-pre-wrap break-all text-red-600">
                {JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}
              </pre>
            ) : (
              <pre className="text-green-600">No error</pre>
            )}
            <div ref={messagesEndRef} /> {/* Scroll anchor */}
          </ScrollArea>

          <div className="flex flex-col gap-2">
            {messages.map((m, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="min-w-[20px]">
                  {m.role === "user" ? (
                    <span className="text-blue-500">User:</span>
                  ) : (
                    <span className="text-green-500">AI:</span>
                  )}
                </div>
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
                      case "tool-invocation":
                        // Handle different states of tool invocation
                        if (part.toolInvocation.state === "partial-call") {
                          return (
                            <div key={partIndex} className="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-2">
                              🔧 Tool: {part.toolInvocation.toolName} (preparing...)
                              <br />
                              Args: {JSON.stringify(part.toolInvocation.args)}
                            </div>
                          )
                        } else if (part.toolInvocation.state === "call") {
                          return (
                            <div key={partIndex} className="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-2">
                              🔧 Tool: {part.toolInvocation.toolName} (executing...)
                              <br />
                              Args: {JSON.stringify(part.toolInvocation.args)}
                            </div>
                          )
                        } else if (part.toolInvocation.state === "result") {
                          return (
                            <div key={partIndex} className="text-xs text-green-600 bg-green-50 p-2 rounded mb-2">
                              ✅ Tool: {part.toolInvocation.toolName} (completed)
                              <br />
                              Result: {JSON.stringify(part.toolInvocation.result).substring(0, 200)}...
                            </div>
                          )
                        }
                        return null
                      case "step-start":
                        return (
                          <div key={partIndex} className="text-sm text-muted-foreground italic mt-2 mb-1">
                            [Starting AI step...]
                          </div>
                        )
                      default:
                        return (
                          <p key={partIndex} className="text-sm whitespace-pre-wrap text-red-400">
                            [Unsupported content type: {part.type}]
                          </p>
                        )
                    }
                  })}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              className="flex-1"
              value={input}
              placeholder="Type a message to test the AI..."
              onChange={handleInputChange}
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
