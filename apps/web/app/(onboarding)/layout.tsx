export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <span className="text-xl font-bold text-orange-500">BuildX</span>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-12">{children}</main>
    </div>
  );
}
