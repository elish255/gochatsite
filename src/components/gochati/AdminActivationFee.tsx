import { useEffect, useState } from "react";
import { platform } from "@/integrations/supabase/platform";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export function AdminActivationFee() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let mounted = true;
    void platform
      .from("gochati_activation_settings")
      .select("enabled")
      .single()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error || !data)
          setMessage("Imeshindwa kupakia Activation Fee. Jaribu kupakia ukurasa upya.");
        else setEnabled(data.enabled);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function save() {
    if (enabled === null || busy) return;
    setBusy(true);
    setMessage("");
    const { data, error } = await platform
      .from("gochati_activation_settings")
      .update({ enabled: !enabled })
      .select("enabled")
      .single();
    setBusy(false);
    setConfirm(false);
    if (error || !data) {
      setMessage("Imeshindwa kuhifadhi. Hali haijabadilishwa; pakia ukurasa upya kuthibitisha.");
      return;
    }
    setEnabled(data.enabled);
    setMessage(
      data.enabled ? "Activation Fee imewashwa tena." : "Activation Fee imezimwa kwa wote.",
    );
  }

  return (
    <section className="card-soft mt-4 space-y-3 p-4" aria-label="Activation Fee">
      <h2 className="text-xl font-bold">Activation Fee</h2>
      <p>
        Hali ya sasa:{" "}
        <strong>
          {enabled === null ? "Haijathibitishwa" : enabled ? "Imewashwa" : "Imezimwa"}
        </strong>
      </p>
      <p className="text-sm text-muted-foreground">
        Ukizima, watumiaji hawatahitaji kulipa activation. Ukiwasha tena, ambao hawajalipa
        watahitaji kulipa. Rekodi za malipo na akaunti zilizozuiwa hazibadilishwi.
      </p>
      <Button disabled={enabled === null || busy} onClick={() => setConfirm(true)}>
        {busy
          ? "Inahifadhi..."
          : enabled === false
            ? "Rudisha Activation Fee"
            : "Ondoa Activation Fee"}
      </Button>
      {message && <p role="status">{message}</p>}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {enabled ? "Ondoa Activation Fee kwa wote?" : "Rudisha Activation Fee kwa wote?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {enabled
                ? "Watumiaji wataweza kutumia akaunti bila kulipa activation."
                : "Watumiaji ambao hawajalipa watahitaji kulipa activation tena kabla ya kuendelea."}{" "}
              Malipo ya Premium, VIP na Tax hayatabadilishwa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Ghairi</AlertDialogCancel>
            <Button disabled={busy} onClick={() => void save()}>
              {busy ? "Inahifadhi..." : "Thibitisha"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
