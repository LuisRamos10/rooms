"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const OfficeCanvas = dynamic(
  () => import("./office-canvas").then((mod) => ({ default: mod.OfficeCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[500px] items-center justify-center rounded-xl border bg-muted/20">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading virtual office...</p>
        </div>
      </div>
    ),
  }
);

export { OfficeCanvas };
