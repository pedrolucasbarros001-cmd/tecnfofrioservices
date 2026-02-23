import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Subtle variants for discrete tags
        subtle: "border bg-transparent font-medium",
        "subtle-urgent": "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 bg-transparent",
        "subtle-warranty": "border-purple-200 text-purple-600 dark:border-purple-700 dark:text-purple-400 bg-transparent",
        "subtle-pricing": "border-amber-200 text-amber-600 dark:border-amber-700 dark:text-amber-400 bg-transparent",
        "subtle-debit": "border-red-200 text-red-600 dark:border-red-700 dark:text-red-400 bg-transparent",
        // Service type badges (kept as discrete identifier, not dominant)
        "type-visita": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-transparent",
        "type-oficina": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-transparent",
        "type-instalacao": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-transparent",
        "type-entrega": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  children?: React.ReactNode;
}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
