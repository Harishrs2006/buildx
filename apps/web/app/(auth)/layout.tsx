export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — branding panel */}
      <div className="hidden lg:flex flex-col justify-between bg-zinc-900 p-12">
        <div>
          <span className="text-2xl font-bold text-orange-500">BuildX</span>
        </div>
        <div className="space-y-4">
          <blockquote className="text-white text-2xl font-medium leading-snug">
            "Source smarter. Build faster."
          </blockquote>
          <p className="text-zinc-400 text-sm">
            India's leading B2B marketplace for construction materials.
            Connect with verified suppliers and get AI-powered quotations.
          </p>
        </div>
        <div className="flex gap-6 text-zinc-500 text-xs">
          <span>10,000+ Products</span>
          <span>500+ Verified Suppliers</span>
          <span>AI-Powered Matching</span>
        </div>
      </div>

      {/* Right — auth form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden mb-8">
            <span className="text-2xl font-bold text-orange-500">BuildX</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
