import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Forces Clerk to issue a fresh session token so updated publicMetadata
// (e.g. role written during onboarding) appears immediately in the JWT.
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Clerk's SDK automatically re-issues the token on the next request.
  // This endpoint just signals the client to reload the session.
  return NextResponse.json({ refreshed: true });
}
