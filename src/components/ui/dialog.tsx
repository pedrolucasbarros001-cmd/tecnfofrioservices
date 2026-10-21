import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-radix-dialog-overlay=""
    className={cn(
      "fixed inset-0 z-50 bg-foreground/25 backdrop-blur-sm duration-[var(--motion-normal)] data-[state=open]:pointer-events-auto data-[state=closed]:pointer-events-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const isRadixPortalInteraction = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return !!(
    target.closest('[data-radix-popper-content-wrapper]') ||
    target.closest('[role="listbox"]') ||
    target.closest('[role="option"]') ||
    target.closest('[data-radix-select-viewport]') ||
    target.closest('[data-radix-dropdown-menu-content]')
  );
};

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  presentation?: "adaptive" | "centered" | "fullscreen";
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, presentation = "adaptive", onPointerDownOutside, onInteractOutside, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      data-presentation={presentation}
      onPointerDownOutside={(e) => {
        if (isRadixPortalInteraction(e.target)) {
          e.preventDefault();
        }
        onPointerDownOutside?.(e);
      }}
      onInteractOutside={(e) => {
        if (isRadixPortalInteraction(e.target)) {
          e.preventDefault();
        }
        onInteractOutside?.(e);
      }}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border/70 bg-card p-6 native-panel native-dialog rounded-lg max-sm:w-[calc(100%-1.5rem)] duration-[var(--motion-slow)] ease-[var(--ease-standard)] data-[state=closed]:duration-[var(--motion-normal)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.97] data-[state=open]:zoom-in-[0.96] data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[49%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[47%]",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="native-close no-print absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full opacity-70 ring-offset-background transition-[opacity,background-color,transform] hover:bg-muted motion-safe:active:scale-90 data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 pr-8 text-left", className)} {...props} />
  )
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-dialog-footer="" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
  )
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-snug", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
