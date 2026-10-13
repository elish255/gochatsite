import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/gochati/AuthPage";
export const Route = createFileRoute("/register")({ component: () => <AuthPage mode="register" /> });
