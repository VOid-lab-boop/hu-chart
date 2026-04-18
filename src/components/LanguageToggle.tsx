import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/I18nProvider";

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "en" ? "ar" : "en")}
      className="gap-1.5 font-mono text-xs uppercase tracking-wider"
    >
      <Languages className="h-4 w-4" />
      {lang === "en" ? "AR" : "EN"}
    </Button>
  );
}
