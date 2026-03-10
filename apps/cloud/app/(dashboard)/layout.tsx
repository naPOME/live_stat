import AuthProvider from '@/components/AuthProvider';
import SidebarNav from '@/components/SidebarNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-[#213448]">
        <SidebarNav />
        <main className="flex-1 ml-56 min-h-screen overflow-y-auto">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
