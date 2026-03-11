import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";

export const dynamic = "force-dynamic";
import { UserProvider } from "@/context/UserContext";
import AuthGuard from "@/components/AuthGuard";
import ApprovalBanner from "@/components/ApprovalBanner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <AuthGuard>
        <div className="app-container bg-[#F5F2ED]">
          <AppHeader />
          <ApprovalBanner />
          <main className="min-h-screen">{children}</main>
          <BottomNav />
        </div>
      </AuthGuard>
    </UserProvider>
  );
}
