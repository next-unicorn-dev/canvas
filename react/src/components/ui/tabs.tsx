import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

function useTabs() {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider")
  }
  return context
}

interface TabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ defaultValue, value: controlledValue, onValueChange, children, className }, ref) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "")
    
    const isControlled = controlledValue !== undefined
    const value = isControlled ? controlledValue : uncontrolledValue
    
    const handleValueChange = React.useCallback((newValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(newValue)
      }
      onValueChange?.(newValue)
    }, [isControlled, onValueChange])
    
    return (
      <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
        <div ref={ref} className={cn("w-full", className)}>
          {children}
        </div>
      </TabsContext.Provider>
    )
  }
)
Tabs.displayName = "Tabs"

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
          className
        )}
        role="tablist"
      >
        {children}
      </div>
    )
  }
)
TabsList.displayName = "TabsList"

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, children, className, disabled }, ref) => {
    const { value: selectedValue, onValueChange } = useTabs()
    const isSelected = selectedValue === value
    
    return (
      <button
        ref={ref}
        role="tab"
        type="button"
        aria-selected={isSelected}
        disabled={disabled}
        onClick={() => onValueChange(value)}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isSelected
            ? "bg-background text-foreground shadow-sm"
            : "hover:bg-background/50 hover:text-foreground",
          className
        )}
      >
        {children}
      </button>
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, children, className }, ref) => {
    const { value: selectedValue } = useTabs()
    
    if (selectedValue !== value) {
      return null
    }
    
    return (
      <div
        ref={ref}
        role="tabpanel"
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
      >
        {children}
      </div>
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }

