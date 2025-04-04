interface CartCounterProps {
    itemCount: number
  }
  
  export function CartCounter({ itemCount }: CartCounterProps) {
    return (
      <div className="flex items-center justify-center">
        <div className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">{itemCount}</div>
      </div>
    )
  }
  
  