import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';

// Checked on the server for every request: nothing inside this folder is
// rendered or sent to the browser unless the visitor is a logged-in admin.
export const dynamic = 'force-dynamic';

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) {
    redirect('/admin/login');
  }
  return <>{children}</>;
}
