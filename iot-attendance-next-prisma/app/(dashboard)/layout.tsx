import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { AutoRefresh } from "@/components/realtime/auto-refresh";
import { Sidebar } from "@/components/layout/sidebar";
import { FlashBanner } from "@/components/ui/flash-banner";
import { authOptions } from "@/lib/auth";
import { getOpenNotifications } from "@/lib/operations";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const notifications = await getOpenNotifications(5);

  return (
    <div className="flex min-h-screen bg-slate-100/80">
      <Sidebar role={(session.user as { role?: string }).role ?? "VIEWER"} />
      <main className="flex-1">
        <AutoRefresh intervalMs={12000} />
        <Header
          name={session.user?.name}
          email={session.user?.email}
          role={(session.user as { role?: string }).role ?? "VIEWER"}
          notificationCount={notifications.length}
          updatedAt={new Date().toISOString()}
        />
        <FlashBanner />
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
