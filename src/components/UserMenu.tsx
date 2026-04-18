import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { KeyRound, LogOut } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ChangePasswordDialog } from "./ChangePasswordDialog";

export function UserMenu() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [pwdOpen, setPwdOpen] = useState(false);

  const fullName = (user?.user_metadata as any)?.full_name as string | undefined;
  const universityId = (user?.user_metadata as any)?.university_id as string | undefined;
  const initials = (fullName || user?.email || "?")
    .split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 gap-2 px-2" aria-label="Account">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="space-y-0.5">
            <div className="font-medium">{fullName || "Account"}</div>
            <div className="text-[11px] font-normal text-muted-foreground">
              {universityId ?? user?.email}
              {roles?.length ? ` · ${roles[0]}` : ""}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPwdOpen(true)} className="gap-2">
            <KeyRound className="h-4 w-4" /> Change password
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut} className="gap-2 text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </>
  );
}
