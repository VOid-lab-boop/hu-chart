import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/components/providers/I18nProvider";
import { format } from "date-fns";

type Filter = "patients" | "charts" | "appointments";

interface Result {
  id: string;
  primary: string;
  secondary?: string;
  href: string;
}

export function GlobalPatientSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("patients");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const handle = setTimeout(async () => {
      const q = query.trim();
      if (filter === "patients") {
        const { data } = await supabase
          .from("patients")
          .select("id, full_name, patient_code")
          .or(`full_name.ilike.%${q}%,patient_code.ilike.%${q}%`)
          .order("full_name").limit(8);
        setResults((data ?? []).map((p) => ({
          id: p.id, primary: p.full_name, secondary: p.patient_code, href: `/app/patients/${p.id}`,
        })));
      } else if (filter === "charts") {
        const { data: pts } = await supabase.from("patients").select("id, full_name, patient_code")
          .or(`full_name.ilike.%${q}%,patient_code.ilike.%${q}%`).limit(20);
        const ids = (pts ?? []).map((p) => p.id);
        if (!ids.length) return setResults([]);
        const { data: charts } = await supabase.from("periodontal_charts")
          .select("id, patient_id, status, chart_date").in("patient_id", ids)
          .order("created_at", { ascending: false }).limit(8);
        const map = new Map((pts ?? []).map((p) => [p.id, p]));
        setResults((charts ?? []).map((c) => ({
          id: c.id, primary: map.get(c.patient_id)?.full_name ?? "—",
          secondary: `${c.status} · ${format(new Date(c.chart_date), "MMM d, yyyy")}`,
          href: `/app/charting/${c.id}`,
        })));
      } else {
        const { data: pts } = await supabase.from("patients").select("id, full_name, patient_code")
          .or(`full_name.ilike.%${q}%,patient_code.ilike.%${q}%`).limit(20);
        const ids = (pts ?? []).map((p) => p.id);
        if (!ids.length) return setResults([]);
        const { data: appts } = await supabase.from("appointments")
          .select("id, patient_id, scheduled_at, procedure").in("patient_id", ids)
          .order("scheduled_at", { ascending: false }).limit(8);
        const map = new Map((pts ?? []).map((p) => [p.id, p]));
        setResults((appts ?? []).map((a) => ({
          id: a.id, primary: map.get(a.patient_id)?.full_name ?? "—",
          secondary: `${format(new Date(a.scheduled_at), "MMM d, HH:mm")} · ${a.procedure ?? "Visit"}`,
          href: `/app/appointments`,
        })));
      }
      setOpen(true);
    }, 200);
    return () => clearTimeout(handle);
  }, [query, filter]);

  const go = (href: string) => { setOpen(false); setQuery(""); navigate(href); };

  return (
    <Popover open={open && results.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="hidden md:flex items-center gap-1.5">
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="h-9 w-32 bg-muted/40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="patients">Patients</SelectItem>
              <SelectItem value="charts">Charts</SelectItem>
              <SelectItem value="appointments">Appointments</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length && setOpen(true)}
              placeholder={t("search")}
              className="h-9 pl-9 bg-muted/40"
            />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-1"
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul className="max-h-80 overflow-y-auto">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => go(r.href)}
                className="flex w-full flex-col items-start rounded px-2 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="truncate font-medium">{r.primary}</span>
                {r.secondary && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{r.secondary}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
