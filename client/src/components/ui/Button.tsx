import React from "react";
import { cn } from "../../lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "emerald";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

    const variants = {
      primary:
        "bg-navy-900 text-white hover:bg-navy-800 dark:bg-primary dark:hover:bg-primary/90 focus:ring-navy-700 shadow-sm",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-muted",
      outline:
        "border border-border bg-transparent hover:bg-muted/50 text-foreground focus:ring-border",
      ghost:
        "bg-transparent hover:bg-muted text-foreground focus:ring-muted",
      destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive shadow-sm",
      emerald:
        "bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-400 shadow-sm font-semibold",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
