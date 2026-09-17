"use client";

import React, { forwardRef } from "react";
import { cn } from "@/utils/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: "none" | "subtle" | "medium" | "high";
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation = "subtle", interactive = false, children, ...props }, ref) => {
    const elevationStyles = {
      none: "bg-gov-surface dark:bg-gov-darkSurface",
      subtle: "bg-gov-surface dark:bg-gov-darkSurface shadow-subtle",
      medium: "bg-gov-surface dark:bg-gov-darkSurface shadow-elevation",
      high: "bg-gov-surface dark:bg-gov-darkSurface shadow-floating",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-card p-6 transition-all duration-200",
          elevationStyles[elevation],
          interactive &&
            "cursor-pointer hover:shadow-elevation hover:-translate-y-0.5 active:translate-y-0",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
