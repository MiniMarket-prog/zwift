import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h3 className="text-xl font-medium">Loading Initial Investments...</h3>
        <p className="text-sm text-muted-foreground">Preparing your investment data</p>
      </div>
    </div>
  )
}
    