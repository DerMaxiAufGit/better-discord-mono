import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface DropdownMenuProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function DropdownMenu({ open, onOpenChange, children }: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [triggerRect, setTriggerRect] = React.useState<DOMRect | null>(null)
  const triggerRef = React.useRef<HTMLElement | null>(null)

  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen

  React.useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown-menu]') && !target.closest('[data-dropdown-content]')) {
        setIsOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, setIsOpen])

  const updateTriggerRect = React.useCallback((element: HTMLElement | null) => {
    triggerRef.current = element
    if (element) {
      setTriggerRect(element.getBoundingClientRect())
    }
  }, [])

  return (
    <div className="relative inline-block" data-dropdown-menu>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<any>, {
              isOpen,
              setIsOpen,
              triggerRect,
              updateTriggerRect
            })
          : child
      )}
    </div>
  )
}

interface DropdownMenuTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
  updateTriggerRect?: (element: HTMLElement | null) => void
}

export const DropdownMenuTrigger = React.forwardRef<HTMLDivElement, DropdownMenuTriggerProps>(
  ({ asChild, children, isOpen, setIsOpen, updateTriggerRect, ...props }, ref) => {
    const internalRef = React.useRef<HTMLElement>(null)

    const handleClick = (e: React.MouseEvent) => {
      updateTriggerRect?.(e.currentTarget as HTMLElement)
      setIsOpen?.(!isOpen)
    }

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        onClick: handleClick,
        ref: internalRef,
      })
    }

    return (
      <div ref={ref} onClick={handleClick} {...props}>
        {children}
      </div>
    )
  }
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end'
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
  triggerRect?: DOMRect | null
}

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, align = 'start', isOpen, triggerRect, children, ...props }, _ref) => {
    const contentRef = React.useRef<HTMLDivElement>(null)
    const [adjustedStyle, setAdjustedStyle] = React.useState<React.CSSProperties>({})

    React.useLayoutEffect(() => {
      if (!isOpen || !triggerRect || !contentRef.current) return

      const content = contentRef.current
      const contentRect = content.getBoundingClientRect()
      const padding = 8 // Min distance from screen edge

      let left = triggerRect.left
      let top = triggerRect.bottom + 4

      // Adjust horizontal position based on alignment
      if (align === 'end') {
        left = triggerRect.right - contentRect.width
      } else if (align === 'center') {
        left = triggerRect.left + (triggerRect.width / 2) - (contentRect.width / 2)
      }

      // Keep within horizontal bounds
      if (left < padding) {
        left = padding
      } else if (left + contentRect.width > window.innerWidth - padding) {
        left = window.innerWidth - contentRect.width - padding
      }

      // Keep within vertical bounds (flip above if needed)
      if (top + contentRect.height > window.innerHeight - padding) {
        top = triggerRect.top - contentRect.height - 4
      }

      setAdjustedStyle({
        position: 'fixed',
        top,
        left,
        zIndex: 9999,
      })
    }, [isOpen, triggerRect, align])

    if (!isOpen || !triggerRect) return null

    // Initial position (will be adjusted by useLayoutEffect)
    const initialStyle: React.CSSProperties = {
      position: 'fixed',
      top: triggerRect.bottom + 4,
      left: triggerRect.left,
      zIndex: 9999,
      visibility: Object.keys(adjustedStyle).length ? 'visible' : 'hidden',
      ...adjustedStyle,
    }

    return createPortal(
      <div
        ref={contentRef}
        data-dropdown-content
        className={cn(
          "min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
          className
        )}
        style={initialStyle}
        {...props}
      >
        {children}
      </div>,
      document.body
    )
  }
)
DropdownMenuContent.displayName = "DropdownMenuContent"

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, children, onClick, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
          className
        )}
        onClick={onClick}
        {...props}
      >
        {children}
      </div>
    )
  }
)
DropdownMenuItem.displayName = "DropdownMenuItem"

interface DropdownMenuSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  )
)
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"
