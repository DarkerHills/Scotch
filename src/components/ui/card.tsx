import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-stroke-soft bg-bg-default shadow-xs", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  className,
  titleAs: H = "h2",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  titleAs?: "h2" | "h3";
}) {
  return (
    <div className={cn("flex items-start gap-3 px-5 pt-4 pb-3", className)}>
      {icon && (
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-10 bg-bg-soft text-text-sub [&_svg]:size-[18px]">{icon}</span>
      )}
      <div className="min-w-0 flex-1">
        <H className="text-sm font-medium text-text-strong">{title}</H>
        {description && <p className="mt-0.5 text-xs text-text-sub">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2 border-t border-stroke-soft px-5 py-3", className)} {...props} />;
}

export function Divider({ className }: { className?: string }) {
  return <div role="separator" className={cn("h-px w-full bg-bg-subtle", className)} />;
}

/** Label/value pair used in detail cards. */
export function DetailRow({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-2 text-sm", className)}>
      <dt className="shrink-0 text-text-sub">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-text-strong tnum">{children}</dd>
    </div>
  );
}
