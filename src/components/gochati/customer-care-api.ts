export async function careApi(body: Record<string, unknown>) {
  const response = await fetch("/api/gochati-support", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Huduma haipatikani. Jaribu tena.");
  return data;
}
