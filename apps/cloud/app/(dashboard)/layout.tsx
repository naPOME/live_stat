import AuthProvider from '@/components/AuthProvider';
import SidebarNav from '@/components/SidebarNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <SidebarNav />
        <main className="flex-1 ml-[260px] min-h-screen overflow-y-auto relative">
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  );
}
