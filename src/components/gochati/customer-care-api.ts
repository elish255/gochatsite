
import { supabase } from "../../src/integrations/supabase/client";

export async function careApi(body: Record<string, unknown>) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error("Tafadhali ingia tena kwenye akaunti yako.");
  }

  const response = await fetch("/api/gochati-support", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Huduma haipatikani. Jaribu tena."
    );
  }

  return data;
}
