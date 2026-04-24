import Image from "next/image";

import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandLogo({
  variant = "horizontal",
  className,
  priority = false,
}: {
  variant?: "horizontal" | "icon" | "stacked";
  className?: string;
  priority?: boolean;
}) {
  const src = brand.assets[variant];
  const dimensions =
    variant === "horizontal"
      ? { width: 360, height: 80 }
      : variant === "stacked"
        ? { width: 220, height: 220 }
        : { width: 120, height: 80 };

  return (
    <Image
      src={src}
      alt={brand.displayName}
      width={dimensions.width}
      height={dimensions.height}
      priority={priority}
      className={cn("h-auto w-auto", className)}
    />
  );
}
