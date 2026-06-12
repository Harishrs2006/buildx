import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign In' };

export default function SignInPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sign in to your BuildX account
        </p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'shadow-none border border-border rounded-xl p-6 bg-card',
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
            socialButtonsBlockButton:
              'border border-border rounded-lg h-10 text-sm font-medium hover:bg-muted transition-colors',
            formButtonPrimary:
              'bg-orange-500 hover:bg-orange-600 text-white rounded-lg h-10 text-sm font-medium',
            formFieldInput:
              'border border-border rounded-lg h-10 px-3 text-sm bg-background focus:ring-2 focus:ring-orange-500',
            footerActionLink: 'text-orange-500 hover:text-orange-600',
          },
        }}
      />
    </div>
  );
}
