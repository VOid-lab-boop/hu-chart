import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HULogo } from "@/components/HULogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/components/providers/I18nProvider";
import { toast } from "sonner";
import { Loader2, GraduationCap, ShieldCheck } from "lucide-react";

/** Build a synthetic email from a university number so Supabase Auth (email-based) keeps working. */
const uniToEmail = (uid: string) => `${uid.trim()}@student.hu.edu.jo`;

export default function Auth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  // student / staff sign in by university id
  const [siUid, setSiUid] = useState("");
  const [siPwd, setSiPwd] = useState("");

  // first-admin bootstrap signup (only allowed if no users yet — UI hint)
  const [adEmail, setAdEmail] = useState("");
  const [adPwd, setAdPwd] = useState("");
  const [adName, setAdName] = useState("");
  const [adUid, setAdUid] = useState("");

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (user) return <Navigate to={(location.state as any)?.from?.pathname ?? "/app"} replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // Resolve the email tied to this university number
      const { data: emailLookup, error: lookupErr } = await supabase.rpc("email_from_university_id", { _uid: siUid.trim() });
      if (lookupErr) throw lookupErr;

      const resolvedEmail = (emailLookup as string | null) ?? uniToEmail(siUid);
      const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password: siPwd });
      if (error) {
        toast.error("Invalid university number or password");
      } else {
        toast.success("Signed in");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleAdminSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adPwd.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setBusy(true);
    const redirectUrl = `${window.location.origin}/app`;
    const { error } = await supabase.auth.signUp({
      email: adEmail.trim(),
      password: adPwd,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: adName, university_id: adUid.trim(), role: "admin" },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Admin account created. The first ever account is auto-promoted to admin.");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-surface p-4">
      <div className="absolute right-4 top-4 flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <HULogo size={48} />
        </div>

        <Card className="border-border/60 p-6 shadow-lg">
          <div className="mb-5 text-center">
            <h2 className="font-display text-xl font-semibold tracking-tight">{t("app_title")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Faculty of Dentistry — Periodontal Suite</p>
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin" className="gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" /> {t("signin")}
              </TabsTrigger>
              <TabsTrigger value="bootstrap" className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> First admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div>
                  <Label htmlFor="si-uid">{t("university_id")}</Label>
                  <Input
                    id="si-uid"
                    inputMode="numeric"
                    autoComplete="username"
                    placeholder="e.g. 2336919"
                    required
                    value={siUid}
                    onChange={(e) => setSiUid(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="si-pwd">{t("password")}</Label>
                  <Input id="si-pwd" type="password" autoComplete="current-password" required value={siPwd} onChange={(e) => setSiPwd(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("signin")}
                </Button>
                <p className="pt-2 text-center text-[11px] text-muted-foreground">
                  Don't have an account? Ask an administrator to create one for you.
                </p>
              </form>
            </TabsContent>

            <TabsContent value="bootstrap" className="mt-4">
              <div className="mb-3 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Use this <strong>only the first time</strong> to create the founding administrator account.
                After that, all student & supervisor accounts must be created from the in-app Users page.
              </div>
              <form onSubmit={handleAdminSignUp} className="space-y-3">
                <div>
                  <Label>Full name</Label>
                  <Input required value={adName} onChange={(e) => setAdName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("university_id")}</Label>
                    <Input required value={adUid} onChange={(e) => setAdUid(e.target.value)} placeholder="2336919" />
                  </div>
                  <div>
                    <Label>{t("email")}</Label>
                    <Input type="email" required value={adEmail} onChange={(e) => setAdEmail(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>{t("password")}</Label>
                  <Input type="password" required minLength={6} value={adPwd} onChange={(e) => setAdPwd(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create admin account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          The Hashemite University · Clinical Edition
        </p>
      </div>
    </div>
  );
}
