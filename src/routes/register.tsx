import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/chatdunia/AuthPage";
export const Route = createFileRoute("/register")({ component: () => <AuthPage mode="register" /> });
