import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function ComingSoon({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <Topbar title={title} subtitle={subtitle} />
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="flex flex-col items-center gap-3 p-10 text-center max-w-md">
          <Construction className="h-10 w-10 text-primary" />
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            This module is part of the next iteration. The data layer, schema, and routes are already wired — the UI lands shortly.
          </p>
        </Card>
      </div>
    </>
  );
}
