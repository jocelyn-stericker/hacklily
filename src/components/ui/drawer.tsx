import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "#/lib/utils";

function Drawer({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

const DrawerTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof DrawerPrimitive.Trigger>
>(function DrawerTrigger(
  { ...props }: React.ComponentProps<typeof DrawerPrimitive.Trigger>,
  ref,
) {
  return (
    <DrawerPrimitive.Trigger ref={ref} data-slot="drawer-trigger" {...props} />
  );
});

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

const DrawerClose = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof DrawerPrimitive.Close>
>(function DrawerClose(
  { ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>,
  ref,
) {
  return (
    <DrawerPrimitive.Close ref={ref} data-slot="drawer-close" {...props} />
  );
});

const DrawerOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof DrawerPrimitive.Overlay>
>(function DrawerOverlay(
  { className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Overlay>,
  ref,
) {
  return (
    <DrawerPrimitive.Overlay
      ref={ref}
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
});

const DrawerContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof DrawerPrimitive.Content>
>(function DrawerContent(
  {
    className,
    children,
    ...props
  }: React.ComponentProps<typeof DrawerPrimitive.Content>,
  ref,
) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content fixed z-50 flex h-auto flex-col bg-popover text-sm text-popover-foreground data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-xl data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:rounded-r-xl data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:rounded-l-xl data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-xl data-[vaul-drawer-direction=top]:border-b data-[vaul-drawer-direction=left]:sm:max-w-sm data-[vaul-drawer-direction=right]:sm:max-w-sm",
          className,
        )}
        {...props}
      >
        <div className="mx-auto mt-4 hidden h-1 w-[100px] shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});

const DrawerHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(function DrawerHeader(
  { className, ...props }: React.ComponentProps<"div">,
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-0.5 md:text-left",
        className,
      )}
      {...props}
    />
  );
});

const DrawerFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(function DrawerFooter(
  { className, ...props }: React.ComponentProps<"div">,
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
});

const DrawerTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentProps<typeof DrawerPrimitive.Title>
>(function DrawerTitle(
  { className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Title>,
  ref,
) {
  return (
    <DrawerPrimitive.Title
      ref={ref}
      data-slot="drawer-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className,
      )}
      {...props}
    />
  );
});

const DrawerDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentProps<typeof DrawerPrimitive.Description>
>(function DrawerDescription(
  {
    className,
    ...props
  }: React.ComponentProps<typeof DrawerPrimitive.Description>,
  ref,
) {
  return (
    <DrawerPrimitive.Description
      ref={ref}
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
