
import { logoUrl } from "@/lib/gochati-media";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { platform } from "@/integrations/supabase/platform";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/payment")({
  component: PaymentPage,
});

type PaymentType = "premium" | "vip" | "tax";

const PAYMENT_INFO = {
  premium: {
    title: "Upgrade Premium Account",
    description: " HONGERA Ili kutoa Pesa zako unatakiwa kubadilisha Account yako kua Premium Lipa Premium Fee TZS 32,000 Sasa.",
    amount: 32000,
    button: "LIPA SASA — TZS 32,000",
    success: "Malipo yamefanikiwa. Akaunti yako imebadilishwa kuwa Premium.",
  },
  vip: {
    title: "Upgrade VIP Account",
    description: " HONGERA Umefikia Hatua ya Mwisho Kupokea PESA zako, Lipa TZS 35,500 kubadilisha akaunti yako kuwa VIP.",
    amount: 35500,
    button: "LIPA SASA — TZS 35,500",
    success: "Malipo yamefanikiwa. Akaunti yako imebadilishwa kuwa VIP.",
  },
  tax: {
    title: "VIP Tax Payment",
    description: " Malipo Yako Yameidhinishwa Na Yatatumwa Kwenye Namba yako Baada ya Kukamilisha Tax Fee. Lipa TZS 50,000 mara moja ili kuruhusiwa kupokea withdrawal.",
    amount: 50000,
    button: "LIPA TAX — TZS 50,000",
    success: "Malipo ya tax yamefanikiwa. Sasa unaweza kuomba withdrawal.",
  },
};

function PaymentPage() {
  const paymentType =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("type")
      : null;

  if (
    paymentType !== "premium" &&
    paymentType !== "vip" &&
    paymentType !== "tax"
  ) {
    return <AccountAccessRedirect />;
  }

  return <UpgradePaymentPage paymentType={paymentType} />;
}

function AccountAccessRedirect() {
  const nav = useNavigate();

  useEffect(() => {
    let active = true;

    void platform.auth.getUser().then(({ data: { user } }) => {
      if (active) {
        void nav({
          to: user ? "/" : "/register",
          replace: true,
        });
      }
    });

    return () => {
      active = false;
    };
  }, [nav]);

  return (
    <main className="auth-page">
      <p role="status">Inaelekeza kwenye akaunti...</p>
    </main>
  );
}

function UpgradePaymentPage({
  paymentType,
}: {
  paymentType: PaymentType;
}) {
  const info = PAYMENT_INFO[paymentType];

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
        if (active) {
          await nav({ to: "/login", replace: true });
        }
        return;
      }

      const { data, error } = await platform
        .from("gochati_users")
        .select(
          "account_status,balance,is_premium,is_vip,vip_tax_paid"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setBlocked(true);
        setNotice(
          error?.message || "Taarifa za akaunti hazijapatikana."
        );
        return;
      }

      if (
        data.account_status === "deactivated" ||
        data.account_status === "banned"
      ) {
        setBlocked(true);
        setNotice(
          "Akaunti yako imesimamishwa. Wasiliana na huduma kwa wateja."
        );
        return;
      }

      const balance = Number(data.balance || 0);

      if (paymentType === "premium") {
        if (data.is_premium || data.is_vip) {
          setPaid(true);
          setNotice("Akaunti yako tayari ni Premium au VIP.");
          return;
        }

        if (balance < 100000) {
          setBlocked(true);
          setNotice(
            "Unahitaji balance ya angalau TZS 100,000 kabla ya kujiunga na Premium."
          );
        }
      }

      if (paymentType === "vip") {
        if (data.is_vip) {
          setPaid(true);
          setNotice("Akaunti yako tayari ni VIP.");
          return;
        }

        if (!data.is_premium) {
          setBlocked(true);
          setNotice(
            "Unahitaji kuwa Premium kwanza kabla ya kujiunga na VIP."
          );
          return;
        }

        if (balance < 300000) {
          setBlocked(true);
          setNotice(
            "Unahitaji balance ya angalau TZS 300,000 kabla ya kujiunga na VIP."
          );
        }
      }

      if (paymentType === "tax") {
        if (!data.is_vip) {
          setBlocked(true);
          setNotice(
            "Malipo ya tax yanapatikana kwa wanachama wa VIP pekee."
          );
          return;
        }

        if (data.vip_tax_paid) {
          setPaid(true);
          setNotice(
            "Tayari umelipa tax. Huhitaji kulipa tena."
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [nav, paymentType]);

  async function getAuthorizationHeaders() {
    const {
      data: { session },
      error,
    } = await platform.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error(
        "Session imeisha. Ingia tena kwenye akaunti yako."
      );
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    };
  }

  async function checkPaymentStatus(paymentReference: string) {
    const headers = await getAuthorizationHeaders();

    const response = await fetch("/api/gochati-payment", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "status",
        reference: paymentReference,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "Imeshindikana kuangalia hali ya malipo."
      );
    }

    return String(data?.payment_status || "pending").toLowerCase();
  }

  function showSuccess() {
    setPaid(true);
    setNotice(info.success);

    window.setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  }

  async function checkExistingPayment() {
    if (!reference) return;

    setBusy(true);
    setNotice("Tunakagua hali ya malipo...");

    try {
      const status = await checkPaymentStatus(reference);

      if (status === "success") {
        showSuccess();
      } else if (
        [
          "cancelled",
          "user_cancelled",
          "rejected",
          "failed",
          "expired",
        ].includes(status)
      ) {
        setNotice(
          "Malipo hayajakamilika. Unaweza kuanzisha ombi jipya."
        );
      } else {
        setNotice(
          "Bado tunasubiri uthibitisho wa malipo. Tafadhali subiri kidogo kisha angalia tena."
        );
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Imeshindikana kuangalia malipo."
      );
    } finally {
      setBusy(false);
    }
  }

  async function startPayment() {
    setBusy(true);
    setNotice("");

    try {
      const normalized = phone
        .replace(/\D/g, "")
        .replace(/^0/, "255");

      if (!/^255[0-9]{9}$/.test(normalized)) {
        throw new Error(
          "Weka namba sahihi ya simu ya Tanzania."
        );
      }

      const headers = await getAuthorizationHeaders();

      const response = await fetch("/api/gochati-payment", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "create",
          phone: normalized,
          amount: info.amount,
          purpose: paymentType,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Ombi la malipo halijaanza. Jaribu tena."
        );
      }

      if (!data?.reference) {
        throw new Error(
          data?.message ||
            "Namba ya malipo haijapatikana."
        );
      }

      setReference(data.reference);

      setNotice(
        "Ombi limetumwa kwenye simu yako. Thibitisha malipo kwenye simu; tunakagua hali ya malipo..."
      );

      for (let i = 0; i < 24; i++) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, 5000)
        );

        try {
          const status = await checkPaymentStatus(
            data.reference
          );

          if (status === "success") {
            showSuccess();
            return;
          }

          if (
            [
              "cancelled",
              "user_cancelled",
              "rejected",
              "failed",
              "expired",
            ].includes(status)
          ) {
            setNotice(
              "Malipo hayajakamilika. Unaweza kuanzisha ombi jipya."
            );
            return;
          }
        } catch {
          // Endelea kusubiri uthibitisho.
        }
      }

      setNotice(
        "Bado tunasubiri uthibitisho. Usilipe tena; tumia kitufe cha Angalia hali ya malipo baada ya muda."
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Imeshindikana kuanzisha malipo."
      );
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

        <h1>{info.title}</h1>

        <p className="auth-subtitle">
          {info.description}
        </p>

        {blocked ? (
          <p className="auth-error" role="alert">
            {notice}
          </p>
        ) : paid ? (
          <>
            <p className="auth-message" role="status">
              {notice}
            </p>

            <Button
              className="auth-submit"
              onClick={() =>
                nav({ to: "/", replace: true })
              }
            >
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
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  type="tel"
                  placeholder="0712345678"
                  required
                  disabled={busy}
                />
              </div>
            </label>

            <Button
              className="auth-submit"
              disabled={busy}
              onClick={startPayment}
            >
              {busy ? "Inatuma ombi..." : info.button}
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
