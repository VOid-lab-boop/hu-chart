import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/components/providers/I18nProvider";

interface Patient { id: string; full_name: string; patient_code: string }

export function GlobalPatientSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, full_name, patient_code")
        .or(`full_name.ilike.%${query}%,patient_code.ilike.%${query}%`)
        .order("full_name")
        .limit(8);
      setResults(data ?? []);
      setOpen(true);
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const go = (id: string) => {
    setOpen(false);
    setQuery("");
    navigate(`/app/patients/${id}`);
  };

  return (
    <Popover open={open && results.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="hidden md:flex relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder={t("search")}
            className="h-9 pl-9 bg-muted/40"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-1"
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul className="max-h-72 overflow-y-auto">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => go(p.id)}
                className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="truncate">{p.full_name}</span>
                <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{p.patient_code}</span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
