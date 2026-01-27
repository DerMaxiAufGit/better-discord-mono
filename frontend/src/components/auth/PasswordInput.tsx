import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import zxcvbn from "zxcvbn"

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrength?: boolean
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showStrength = false, value, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [strength, setStrength] = React.useState<number | null>(null)

    React.useEffect(() => {
      if (showStrength && value && typeof value === 'string') {
        const result = zxcvbn(value)
        setStrength(result.score)
      } else {
        setStrength(null)
      }
    }, [value, showStrength])

    const getStrengthLabel = (score: number) => {
      const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
      return labels[score]
    }

    const getStrengthColor = (score: number) => {
      const colors = [
        'bg-red-500',
        'bg-orange-500',
        'bg-yellow-500',
        'bg-blue-500',
        'bg-green-500',
      ]
      return colors[score]
    }

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            className={cn("pr-10", className)}
            value={value}
            ref={ref}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {showStrength && strength !== null && value && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    index <= strength
                      ? getStrengthColor(strength)
                      : "bg-muted"
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Password strength: {getStrengthLabel(strength)}
            </p>
          </div>
        )}
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"
