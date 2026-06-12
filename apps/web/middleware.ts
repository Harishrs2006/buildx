import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/products(.*)',
  '/suppliers(.*)',
  '/categories(.*)',
  '/api/webhooks(.*)',
]);

const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)']);
const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isDashboardRoute = createRouteMatcher(['/dashboard(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role as string | undefined;
  const onboardingComplete = (sessionClaims?.metadata as any)?.onboardingComplete as boolean | undefined;

  // Unauthenticated user hitting a protected route
  if (!userId && !isPublicRoute(req)) {
    return (await auth()).redirectToSignIn({ returnBackUrl: req.url });
  }

  // Authenticated user — enforce onboarding
  if (userId && !onboardingComplete && !isOnboardingRoute(req) && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  // Prevent authenticated + onboarded users from re-entering onboarding
  if (userId && onboardingComplete && isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Admin routes: only ADMIN or SUPER_ADMIN
  if (isAdminRoute(req) && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Supplier-only dashboard sections guard (handled per-page as well)
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
