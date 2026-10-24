'use client';

import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/components/auth/AuthProvider';

function ProfileDetails() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-high font-headline text-3xl font-bold text-on-surface-variant">
        {user.name[0]?.toUpperCase() ?? '?'}
      </div>
      <div>
        <p className="font-headline text-xl font-bold text-on-surface">{user.name}</p>
        <p className="font-body text-sm text-on-surface-variant">{user.phone}</p>
      </div>
      <button
        onClick={() => signOut()}
        className="mt-4 rounded-lg bg-surface-container-high px-6 py-3 font-body text-sm font-bold uppercase text-on-surface"
      >
        Sign out
      </button>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 pb-32 pt-24 md:px-8">
        <h1 className="font-headline text-3xl font-bold tracking-tighter">Profile</h1>
        <RequireAuth>
          <ProfileDetails />
        </RequireAuth>
      </main>
      <BottomNav />
    </>
  );
}
