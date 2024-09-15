import * as React from "react";
import * as MetricGroupPrimitive from "@radix-ui/react-radio-group";

import { cn } from "@/lib/utils";

const MetricGroup = React.forwardRef<
  React.ElementRef<typeof MetricGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof MetricGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <MetricGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  );
});
MetricGroup.displayName = MetricGroupPrimitive.Root.displayName;

const MetricGroupItem = React.forwardRef<
  React.ElementRef<typeof MetricGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MetricGroupPrimitive.Item> & {
    label: string;
    value: string;
    total?: string;
  }
>(({ className, label, value, total, ...props }, ref) => {
  return (
    <MetricGroupPrimitive.Item
      ref={ref}
      className={cn(
        "flex items-center justify-between rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary overflow-hidden",
        "data-[state=checked]:opacity-100 data-[state=unchecked]:opacity-60",
        className
      )}
      {...props}
      value={value}
    >
      <div className="flex">
        <div className="bg-primary-lighter p-4 flex items-center justify-center">
          <span className="text-lg text-primary-dark font-semibold">{label}</span>
        </div>
        {total && (
          <div className="p-4 flex flex-col bg-primary-lightest-1 items-start">
            <span className="text-sm font-bold text-primary">Total</span>
            <span className="font-extrabold text-primary-dark">{total}</span>
          </div>
        )}
      </div>
    </MetricGroupPrimitive.Item>
  );
});
MetricGroupItem.displayName = MetricGroupPrimitive.Item.displayName;

export { MetricGroup, MetricGroupItem };
