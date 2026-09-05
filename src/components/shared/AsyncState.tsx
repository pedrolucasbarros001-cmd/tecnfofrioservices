import { AlertCircle, CheckCircle2, Inbox, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AsyncStateVariant = "loading" | "empty" | "error" | "success";

interface AsyncStateProps {
  variant?: AsyncStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}

const stateContent: Record<AsyncStateVariant, { title: string; description: string }> = {
  loading: { title: "A carregar", description: "A informação estará disponível dentro de instantes." },
  empty: { title: "Sem informação", description: "Ainda não existem dados para apresentar." },
  error: { title: "Não foi possível carregar", description: "Verifique a ligação e tente novamente." },
  success: { title: "Concluído", description: "A alteração foi guardada com sucesso." },
};

export function AsyncState({
  variant = "loading",
  title,
  description,
  actionLabel = "Tentar novamente",
  onAction,
  compact = false,
  className,
}: AsyncStateProps) {
  const content = stateContent[variant];
  const Icon = variant === "loading" ? Loader2 : variant === "error" ? AlertCircle : variant === "success" ? CheckCircle2 : Inbox;

  return (
    <div
      className={cn(
        "state-panel motion-enter flex w-full flex-col items-center justify-center text-center",
        compact ? "min-h-28 gap-2 p-4" : "min-h-56 gap-3 p-6",
        className,
      )}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      aria-busy={variant === "loading"}
    >
      <span className={cn("state-icon", `state-icon-${variant}`)}>
        <Icon className={cn("h-5 w-5", variant === "loading" && "animate-spin")} aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title ?? content.title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{description ?? content.description}</p>
      </div>
      {variant === "error" && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}