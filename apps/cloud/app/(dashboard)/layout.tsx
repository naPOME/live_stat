import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SidebarNav from '@/components/SidebarNav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, is_admin, org:organizations(name)')
    .eq('id', user.id)
    .single();

  const orgName = (profile?.org as any)?.name ?? 'My Org';

  return (
    <div className="flex min-h-screen bg-[#213448]">
      <SidebarNav orgName={orgName} isAdmin={(profile as any)?.is_admin === true} />
      <main className="flex-1 ml-56 min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
