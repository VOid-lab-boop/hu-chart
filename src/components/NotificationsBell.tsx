import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatDistanceToNow } from "date-fns";

export function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    setItems(data ?? []);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase.channel("notif-" + user.id).on("postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
      () => load()
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const unread = items.filter((i) => !i.read).length;

  const click = async (item: any) => {
    if (!item.read) await supabase.from("notifications").update({ read: true }).eq("id", item.id);
    if (item.link) navigate(item.link);
    load();
  };

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    load();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] tabular-nums">{unread}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && <Button size="sm" variant="ghost" onClick={markAll} className="h-6 text-xs">Mark all read</Button>}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">No notifications.</p> : (
            items.map((i) => (
              <button key={i.id} onClick={() => click(i)} className={`block w-full border-b border-border p-3 text-left hover:bg-muted/50 ${!i.read ? "bg-primary/5" : ""}`}>
                <p className="text-sm font-medium">{i.title}</p>
                {i.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{i.body}</p>}
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{formatDistanceToNow(new Date(i.created_at), { addSuffix: true })}</p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
