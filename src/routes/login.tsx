import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/gochati/AuthPage";
export const Route = createFileRoute("/login")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://gochati.online/login" }],
    meta: [
      { title: "Ingia kwenye Akaunti — Gochati" },
      {
        name: "description",
        content: "Ingia kwenye akaunti yako ya Gochati ili kuendelea na mazungumzo yako.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
    ],
  }),
  component: () => <AuthPage mode="login" />,
});
