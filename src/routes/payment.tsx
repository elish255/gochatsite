import { logoUrl } from "@/lib/gochati-media";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { platform } from "@/integrations/netlify/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/payment")({ component: PaymentPage });

function PaymentPage() {
  const paymentType =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("type") : null;
  const premiumMode = paymentType === "premium";
  const vipMode = paymentType === "vip";
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [paid, setPaid] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reference, setReference] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await platform.auth.getUser();
      if (!user) {
        if (active) await nav({ to: "/login", replace: true });
        return;
      }
      const { data, error } = await platform
        .from("gochati_users")
        .select("account_status,activation_paid,is_premium,is_vip")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setBlocked(true);
        setNotice(error.message);
        return;
      }
      if (vipMode && data?.is_vip) {
        setPaid(true);
        setNotice("Akaunti yako tayari ni VIP.");
      } else if (premiumMode && data?.is_premium) {
        setPaid(true);
        setNotice("Akaunti yako tayari ni Premium.");
      } else if (
        !premiumMode &&
        !vipMode &&
        data?.activation_paid &&
        data?.account_status === "active"
      ) {
        setPaid(true);
        setNotice("Akaunti yako tayari iko active.");
      } else if (data?.account_status === "deactivated" || data?.account_status === "banned") {
        setBlocked(true);
        setNotice("Akaunti yako imesimamishwa. Wasiliana na huduma kwa wateja.");
      }
    })();
    return () => {
      active = false;
    };
  }, [nav, premiumMode, vipMode]);

  async function checkPaymentStatus(paymentReference: string) {
    const response = await fetch("/api/gochati-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status", reference: paymentReference }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.message || "Imeshindikana kuangalia hali ya malipo.");
    return String(data?.payment_status || "pending").toLowerCase();
  }

  async function checkExistingPayment() {
    if (!reference) return;
    setBusy(true);
    setNotice("Tunakagua hali ya malipo...");
    try {
      const {
        data: { user },
      } = await platform.auth.getUser();
      if (!user) throw new Error("Tafadhali ingia tena kwenye akaunti yako.");
      const status = await checkPaymentStatus(reference);
      if (status === "success") {
        setPaid(true);
        setNotice(
          vipMode
            ? "Malipo yamefanikiwa. Akaunti yako imebadilishwa kuwa VIP."
            : premiumMode
              ? "Malipo yamefanikiwa. Akaunti yako imebadilishwa kuwa Premium."
              : "Malipo yamefanikiwa. Akaunti yako imewashwa.",
        );
        setTimeout(() => {
          window.location.href = "/";
        }, 900);
      } else if (
        ["cancelled", "user_cancelled", "rejected", "failed", "expired"].includes(status)
      ) {
        setNotice("Malipo hayajakamilika. Unaweza kuanzisha ombi jipya.");
      } else {
        setNotice(
          "Bado tunasubiri uthibitisho wa malipo. Tafadhali subiri kidogo kisha angalia tena.",
        );
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Imeshindikana kuangalia malipo.");
    } finally {
      setBusy(false);
    }
  }

  async function startPayment() {
    setBusy(true);
    setNotice("");
    try {
      const normalized = phone.replace(/\D/g, "").replace(/^0/, "255");
      if (!/^255[0-9]{9}$/.test(normalized))
        throw new Error("Weka namba sahihi ya simu ya Tanzania.");
      const {
        data: { user },
      } = await platform.auth.getUser();
      if (!user) throw new Error("Tafadhali ingia tena kwenye akaunti yako.");
      const response = await fetch("/api/gochati-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          phone: normalized,
          amount: vipMode ? 35500 : premiumMode ? 32000 : 16000,
          purpose: vipMode ? "vip" : premiumMode ? "premium" : "activation",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Ombi la malipo halijaanza. Jaribu tena.");
      if (!data?.reference)
        throw new Error(data?.message || "Ombi la malipo halijaanza. Jaribu tena.");
      setReference(data.reference);
      setNotice(
        "Ombi limetumwa kwenye simu yako. Thibitisha malipo kwenye simu; tunakagua hali ya malipo...",
      );
      for (let i = 0; i < 24; i++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        try {
          const status = await checkPaymentStatus(data.reference);
          if (status === "success") {
            setPaid(true);
            setNotice(
              vipMode
                ? "Malipo yamefanikiwa. Akaunti yako imebadilishwa kuwa VIP."
                : premiumMode
                  ? "Malipo yamefanikiwa. Akaunti yako imebadilishwa kuwa Premium."
                  : "Malipo yamefanikiwa. Akaunti yako imewashwa.",
            );
            setTimeout(() => {
              window.location.href = "/";
            }, 900);
            return;
          }
          if (["cancelled", "user_cancelled", "rejected", "failed", "expired"].includes(status)) {
            setNotice("Malipo hayajakamilika. Unaweza kuanzisha ombi jipya.");
            return;
          }
        } catch {
          /* Keep waiting; the next direct status check will query SplashPay again. */
        }
      }
      setNotice(
        "Bado tunasubiri uthibitisho. Usilipe tena; tumia kitufe cha Angalia hali ya malipo baada ya muda.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Imeshindikana kuanzisha malipo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-content">
        <img
          src={logoUrl}
          alt="Gochati"
          width={64}
          height={64}
          className="mx-auto mb-4 rounded-2xl"
        />
        <h1>
          {vipMode
            ? "Upgrade VIP Account"
            : premiumMode
              ? "Upgrade Premium Account"
              : "Activation Fee"}
        </h1>
        <p className="auth-subtitle">
          {vipMode
            ? "Lipa TZS 35,500 kwa kiwango cha VIP."
            : premiumMode
              ? "Lipa TZS 32,000 kubadilisha akaunti yako kuwa Premium."
              : "Lipa TZS 16,000 ili kuwasha akaunti yako na kuendelea kutumia huduma."}
        </p>
        {blocked ? (
          <p className="auth-error">{notice}</p>
        ) : paid ? (
          <>
            <p className="auth-message">{notice}</p>
            <Button className="auth-submit" onClick={() => nav({ to: "/", replace: true })}>
              Endelea
            </Button>
          </>
        ) : (
          <>
            <label className="auth-field">
              <span>Namba ya simu ya malipo</span>
              <div className="auth-input">
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  type="tel"
                  placeholder="0712345678"
                  required
                />
              </div>
            </label>
            <Button className="auth-submit" disabled={busy} onClick={startPayment}>
              {busy
                ? "Inatuma ombi..."
                : vipMode
                  ? "LIPA SASA — TZS 35,500"
                  : premiumMode
                    ? "LIPA SASA — TZS 32,000"
                    : "LIPA SASA — TZS 16,000"}
            </Button>
            {reference && (
              <Button
                variant="outline"
                className="auth-submit"
                disabled={busy}
                onClick={checkExistingPayment}
              >
                Angalia hali ya malipo
              </Button>
            )}
            <p className="auth-message" role="status">
              {notice}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
