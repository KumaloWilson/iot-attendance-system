"use client";

import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Print report" }: { label?: string }) {
  return (
    <Button type="button" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
