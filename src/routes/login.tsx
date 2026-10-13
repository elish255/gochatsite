import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/gotchati/AuthPage";
export const Route = createFileRoute("/login")({ component: () => <AuthPage mode="login" /> });
