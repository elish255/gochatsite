import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/gochati/AuthPage";
export const Route = createFileRoute("/register")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://gochati.online/register" }],
    meta: [
      { title: "Fungua Akaunti — Gochati" },
      {
        name: "description",
        content: "Jisajili Gochati ili kuungana na watu kupitia mazungumzo, lugha na utamaduni.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
    ],
  }),
  component: () => <AuthPage mode="register" />,
});
