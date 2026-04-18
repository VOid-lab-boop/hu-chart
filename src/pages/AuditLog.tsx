import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function AuditLog() {
  const [rows, setRows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: p }] = await Promise.all([
        supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("profiles").select("id, full_name"),
      ]);
      setProfiles(new Map((p ?? []).map((x: any) => [x.id, x.full_name])));
      setRows(a ?? []); setLoading(false);
    })();
  }, []);

  if (loading) return (<><Topbar title="Audit Log" /><div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></>);

  return (
    <>
      <Topbar title="Audit Log" subtitle="Last 200 changes across the system" />
      <div className="flex-1 p-4 md:p-6">
        <Card className="p-5">
          {rows.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No activity yet.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">When</th><th>Who</th><th>Action</th><th>Table</th><th>Record</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="py-2 text-xs">{format(new Date(r.created_at), "PPp")}</td>
                    <td className="text-xs">{profiles.get(r.actor_id) ?? r.actor_id?.slice(0, 8) ?? "system"}</td>
                    <td><Badge variant={r.action === "DELETE" ? "destructive" : r.action === "INSERT" ? "default" : "secondary"} className="text-[10px]">{r.action}</Badge></td>
                    <td className="font-mono text-xs">{r.table_name}</td>
                    <td className="font-mono text-[10px] text-muted-foreground">{r.record_id?.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}
