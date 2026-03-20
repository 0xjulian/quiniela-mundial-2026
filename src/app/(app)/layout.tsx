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
        <div className="min-h-screen bg-gradient-to-b from-[#021024] via-[#041C32] to-[#020817] flex justify-center">
          <div className="app-container w-full max-w-[430px] mx-auto bg-[#FFF9F0] shadow-xl">
            <AppHeader />
            <ApprovalBanner />
            <main className="min-h-screen pb-16">{children}</main>
            <BottomNav />
          </div>
        </div>
      </AuthGuard>
    </UserProvider>
  );
}
