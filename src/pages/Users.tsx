import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { Loader2, Plus, UserCog, Copy, GraduationCap, ShieldCheck, Crown, RefreshCw, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ProfileRow {
  id: string;
  full_name: string;
  university_id: string | null;
  email: string | null;
  created_at: string;
  roles: string[];
}

const roleIcon = (r: string) =>
  r === "admin" ? Crown : r === "supervisor" ? ShieldCheck : GraduationCap;

export default function Users() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");

  const [name, setName] = useState("");
  const [uid, setUid] = useState("");
  const [role, setRole] = useState<"student" | "supervisor" | "admin">("student");
  const [createdInfo, setCreatedInfo] = useState<{ uid: string; email: string; pwd: string } | null>(null);

  const DEFAULT_PASSWORD = "HU12345";

  const load = async () => {
    setLoading(true);
    const [{ data: profiles, error }, { data: rolesData }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, university_id, email, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (error) toast.error(error.message);
    const rolesMap = new Map<string, string[]>();
    (rolesData ?? []).forEach((r: any) => {
      const arr = rolesMap.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesMap.set(r.user_id, arr);
    });
    setRows(((profiles ?? []) as any[]).map(p => ({ ...p, roles: rolesMap.get(p.id) ?? [] })));
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); else setLoading(false); }, [isAdmin]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid.trim()) { toast.error("University number required"); return; }
    if (!name.trim()) { toast.error("Full name required"); return; }

    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { full_name: name.trim(), university_id: uid.trim(), password: DEFAULT_PASSWORD, role },
    });
    setBusy(false);

    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Could not create account");
      return;
    }

    const createdEmail = (data as any).user.email as string;
    setCreatedInfo({ uid: uid.trim(), email: createdEmail, pwd: DEFAULT_PASSWORD });
    toast.success(`Account created for ${uid.trim()}`);
    setName(""); setUid(""); setRole("student");
    setOpen(false);
    load();
  };

  if (!isAdmin) {
    return (
      <>
        <Topbar title="Users" />
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="max-w-md p-8 text-center">
            <UserCog className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-display text-lg font-semibold">Admins only</h3>
            <p className="mt-1 text-sm text-muted-foreground">Only administrators can create and manage user accounts.</p>
          </Card>
        </div>
      </>
    );
  }

  const filtered = rows.filter(r =>
    !filter ||
    r.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
    r.university_id?.includes(filter) ||
    r.email?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      <Topbar
        title="Users & accounts"
        subtitle={`${rows.length} accounts · admins, supervisors, students`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={load} aria-label="Refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New account</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a new account</DialogTitle>
                  <DialogDescription>
                    Every new account starts with the default password <span className="font-mono font-semibold">HU12345</span>. Users can change it from their account menu after signing in.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={create} className="space-y-3">
                  <div>
                    <Label>Full name</Label>
                    <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lara Khalil" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>University number</Label>
                      <Input required inputMode="numeric" value={uid} onChange={e => setUid(e.target.value)} placeholder="2336920" />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <Select value={role} onValueChange={(v: any) => setRole(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="supervisor">Supervisor (Faculty)</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <div className="text-xs">
                      <p className="font-medium">Default password: <span className="font-mono">HU12345</span></p>
                      <p className="text-muted-foreground">User should change this on first sign-in.</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={busy} className="gap-1.5">
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create account
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="flex-1 space-y-4 p-4 md:p-6">
        {createdInfo && (
          <Card className="border-[hsl(var(--severity-healthy))]/40 bg-[hsl(var(--severity-healthy))]/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-display text-sm font-semibold">Account ready · share these credentials with the user</p>
                <div className="grid gap-1 font-mono text-xs">
                  <Row k="University ID" v={createdInfo.uid} />
                  <Row k="Login email" v={createdInfo.email} />
                  <Row k="Temp password" v={createdInfo.pwd} />
                </div>
                <p className="pt-1 text-[11px] text-muted-foreground">They sign in at the auth page using their university number and this password.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setCreatedInfo(null)}>Dismiss</Button>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold">All accounts</h3>
            <Input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search name, university number, email…"
              className="h-9 w-72 max-w-full"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No accounts match.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">University ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Roles</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(r => (
                    <tr key={r.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono">{r.university_id ?? "—"}</td>
                      <td className="px-4 py-3 font-medium">{r.full_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.roles.map(rr => {
                            const Icon = roleIcon(rr);
                            return (
                              <Badge key={rr} variant={rr === "admin" ? "default" : "secondary"} className="gap-1 capitalize">
                                <Icon className="h-3 w-3" /> {rr}
                              </Badge>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 text-muted-foreground">{k}</span>
      <span className="font-semibold">{v}</span>
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(v); toast.success("Copied"); }}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}
