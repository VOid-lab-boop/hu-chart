import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { Loader2, Plus, UserCog, Copy } from "lucide-react";
import { toast } from "sonner";

const uniToEmail = (uid: string) => `${uid.trim()}@student.hu.edu.jo`;

interface ProfileRow {
  id: string;
  full_name: string;
  university_id: string | null;
  email: string | null;
  created_at: string;
  roles: string[];
}

export default function Users() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // create form
  const [name, setName] = useState("");
  const [uid, setUid] = useState("");
  const [pwd, setPwd] = useState("");
  const [role, setRole] = useState<"student" | "supervisor" | "admin">("student");
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

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
    setRows(((profiles ?? []) as any[]).map((p) => ({ ...p, roles: rolesMap.get(p.id) ?? [] })));
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); else setLoading(false); }, [isAdmin]);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let p = "";
    for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setPwd(p);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid.trim()) { toast.error("University number required"); return; }
    if (pwd.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    setBusy(true);
    const email = uniToEmail(uid);

    // We use the standard signUp endpoint. The handle_new_user trigger reads role from metadata.
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pwd,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: name, university_id: uid.trim(), role },
      },
    });

    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    // signUp will sign IN the new user on this client (since auto-confirm is on),
    // which would log out the admin. Sign back in to admin? Easier: sign out the freshly-created user
    // and rely on the admin's persisted session via the previous login. But Supabase replaces the session.
    // Workaround: sign the new user out immediately. The admin will need to sign in again.
    await supabase.auth.signOut();
    setBusy(false);
    setCreatedEmail(email);
    toast.success(`Account created for ${uid}. You've been signed out — please sign back in as admin.`);
    setName(""); setUid(""); setPwd(""); setRole("student");
    setOpen(false);
    // Force reload so AuthProvider picks up the signed-out state and routes to /auth
    setTimeout(() => { window.location.href = "/auth"; }, 1500);
  };

  if (!isAdmin) {
    return (
      <>
        <Topbar title="Users" />
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="p-8 text-center max-w-md">
            <UserCog className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-display text-lg font-semibold">Admins only</h3>
            <p className="mt-1 text-sm text-muted-foreground">Only administrators can create and manage user accounts.</p>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title="Users"
        subtitle={`${rows.length} accounts`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create account</DialogTitle></DialogHeader>
              <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
                <strong>Heads up:</strong> creating an account will sign you out (Supabase limitation). You'll be redirected to sign back in.
              </div>
              <form onSubmit={create} className="space-y-3">
                <div>
                  <Label>Full name</Label>
                  <Input required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>University number</Label>
                    <Input required inputMode="numeric" value={uid} onChange={(e) => setUid(e.target.value)} placeholder="2336919" />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={role} onValueChange={(v: any) => setRole(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Temporary password</Label>
                  <div className="flex gap-2">
                    <Input required minLength={6} value={pwd} onChange={(e) => setPwd(e.target.value)} />
                    <Button type="button" variant="outline" onClick={generatePassword}>Generate</Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex-1 p-4 md:p-6">
        {createdEmail && (
          <Card className="mb-4 p-4 bg-success/10 border-success/40">
            <p className="text-sm font-medium">Account created.</p>
            <div className="mt-1 flex items-center gap-2 font-mono text-xs">
              <span>Login email: {createdEmail}</span>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(createdEmail); toast.success("Copied"); }}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">University ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Roles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono">{r.university_id ?? "—"}</td>
                      <td className="px-4 py-3 font-medium">{r.full_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {r.roles.map((rr) => (
                            <Badge key={rr} variant={rr === "admin" ? "default" : "secondary"} className="capitalize">{rr}</Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
