import { Outlet } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import AuthLayout from "./AuthLayout";

export function AppLayout() {
  return (
    <AuthLayout>
      <Outlet />
      <Toaster richColors position="top-right" />
    </AuthLayout>
  );
}
