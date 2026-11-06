import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import AdminNavClient from './AdminNavClient';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminSession();

  // If user is accessing /admin/login, let it render without redirection
  return (
    <div className="min-h-screen bg-pitch-darkest pb-20">
      {admin && <AdminNavClient username={admin.username} />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">{children}</div>
    </div>
  );
}

