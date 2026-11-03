import { useEffect, useState } from "react";

export function useActivationFee() {
  const [fee, setFee] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/gochati-settings", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !Number.isSafeInteger(data.activation_fee) || data.activation_fee < 1)
          throw new Error("Ada haipatikani. Jaribu tena.");
        if (active) { setFee(data.activation_fee); setError(""); }
      } catch {
        if (active) { setFee(null); setError("Ada haipatikani. Jaribu tena."); }
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  return { fee, error, formatted: fee === null ? "…" : fee.toLocaleString("en-US") };
}
