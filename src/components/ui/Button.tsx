"use client";

import React, { forwardRef } from "react";
import { cn } from "@/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] select-none rounded-btn";

    const variantStyles = {
      primary:
        "bg-gov-primary text-white hover:bg-gov-primaryHover focus:ring-gov-primary shadow-subtle hover:shadow-elevation",
      secondary:
        "bg-gov-primaryLight text-gov-primary hover:bg-[#D7E6F3] focus:ring-gov-primary",
      danger:
        "bg-gov-danger text-white hover:bg-[#B71C1C] focus:ring-gov-danger shadow-subtle hover:shadow-elevation",
      ghost:
        "bg-transparent text-gov-text hover:bg-black/5 dark:hover:bg-white/10 focus:ring-gov-primary",
      outline:
        "bg-transparent border border-gov-borderMuted text-gov-text hover:bg-black/5 dark:hover:bg-white/5 focus:ring-gov-primary",
    };

    const sizeStyles = {
      sm: "text-sm px-3.5 py-2 gap-1.5",
      md: "text-base px-5 py-2.5 gap-2",
      lg: "text-base md:text-lg px-7 py-3.5 gap-2.5 font-semibold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
