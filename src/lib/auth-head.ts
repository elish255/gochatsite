export function authHead(title: string, description: string) {
  return { meta: [{ title: `${title} — Gochati` }, { name: "description", content: description }, { property: "og:title", content: `${title} — Gochati` }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
}