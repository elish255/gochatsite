import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/gochat/AuthPage";
export const Route = createFileRoute("/login")({ component: () => <AuthPage mode="login" /> });
