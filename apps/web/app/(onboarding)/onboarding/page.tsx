'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Building2, ShoppingCart, ArrowRight, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

type Step = 'role' | 'details';
type Role = 'BUYER' | 'SUPPLIER';

export default function OnboardingPage() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buyer form state
  const [buyerForm, setBuyerForm] = useState({
    companyName: '',
    gstin: '',
  });

  // Supplier form state
  const [supplierForm, setSupplierForm] = useState({
    businessName: '',
    description: '',
    website: '',
    addressLine1: '',
    city: '',
    state: '',
    pincode: '',
    serviceAreas: '',
  });

  const handleRoleSelect = (selected: Role) => {
    setRole(selected);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!role) return;
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();

      const payload =
        role === 'BUYER'
          ? {
              role: 'BUYER' as const,
              companyName: buyerForm.companyName || undefined,
              gstin: buyerForm.gstin || undefined,
            }
          : {
              role: 'SUPPLIER' as const,
              businessName: supplierForm.businessName,
              description: supplierForm.description || undefined,
              website: supplierForm.website || undefined,
              address: {
                line1: supplierForm.addressLine1,
                city: supplierForm.city,
                state: supplierForm.state,
                pincode: supplierForm.pincode,
              },
              serviceAreas: supplierForm.serviceAreas
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            };

      await apiClient.post('/users/onboarding', payload, { token: token ?? undefined });

      // Force Clerk session refresh so new role metadata appears in JWT
      await fetch('/api/auth/refresh', { method: 'POST' });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'role') {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Welcome to BuildX</h1>
          <p className="text-muted-foreground">
            Tell us how you'll be using the platform
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => handleRoleSelect('BUYER')}
            className="group flex flex-col items-start gap-4 p-6 rounded-2xl border-2 border-border hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all text-left"
          >
            <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
              <ShoppingCart className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-lg">I'm a Buyer</h2>
              <p className="text-muted-foreground text-sm mt-1">
                I want to source construction materials from verified suppliers
              </p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-orange-500 text-sm font-medium">
              Get started <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          <button
            onClick={() => handleRoleSelect('SUPPLIER')}
            className="group flex flex-col items-start gap-4 p-6 rounded-2xl border-2 border-border hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all text-left"
          >
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-lg">I'm a Supplier</h2>
              <p className="text-muted-foreground text-sm mt-1">
                I want to list my products and connect with construction companies
              </p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-orange-500 text-sm font-medium">
              Get started <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <button
          onClick={() => setStep('role')}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-foreground">
          {role === 'BUYER' ? 'Your Company Details' : 'Your Business Details'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {role === 'BUYER'
            ? 'Optional — helps suppliers tailor their quotes for you'
            : 'Required — this information will be shown to buyers'}
        </p>
      </div>

      <div className="space-y-4">
        {role === 'BUYER' ? (
          <>
            <Field label="Company Name (optional)">
              <input
                type="text"
                placeholder="Sharma Constructions Pvt Ltd"
                value={buyerForm.companyName}
                onChange={(e) => setBuyerForm((f) => ({ ...f, companyName: e.target.value }))}
                className={inputCls}
              />
            </Field>
            <Field label="GSTIN (optional)">
              <input
                type="text"
                placeholder="22AAAAA0000A1Z5"
                value={buyerForm.gstin}
                onChange={(e) => setBuyerForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                className={inputCls}
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Business Name *">
              <input
                type="text"
                placeholder="ABC Cement Suppliers"
                value={supplierForm.businessName}
                onChange={(e) => setSupplierForm((f) => ({ ...f, businessName: e.target.value }))}
                className={inputCls}
                required
              />
            </Field>
            <Field label="Description (optional)">
              <textarea
                placeholder="Brief description of your business and products..."
                value={supplierForm.description}
                onChange={(e) => setSupplierForm((f) => ({ ...f, description: e.target.value }))}
                className={`${inputCls} h-24 resize-none`}
              />
            </Field>
            <Field label="Address Line 1 *">
              <input
                type="text"
                placeholder="123 Industrial Area, Phase 2"
                value={supplierForm.addressLine1}
                onChange={(e) => setSupplierForm((f) => ({ ...f, addressLine1: e.target.value }))}
                className={inputCls}
                required
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="City *">
                <input
                  type="text"
                  placeholder="Mumbai"
                  value={supplierForm.city}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, city: e.target.value }))}
                  className={inputCls}
                  required
                />
              </Field>
              <Field label="State *">
                <input
                  type="text"
                  placeholder="Maharashtra"
                  value={supplierForm.state}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, state: e.target.value }))}
                  className={inputCls}
                  required
                />
              </Field>
              <Field label="Pincode *">
                <input
                  type="text"
                  placeholder="400001"
                  maxLength={6}
                  value={supplierForm.pincode}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, '') }))}
                  className={inputCls}
                  required
                />
              </Field>
            </div>
            <Field label="Service Areas * (comma-separated cities/states)">
              <input
                type="text"
                placeholder="Mumbai, Pune, Thane, Maharashtra"
                value={supplierForm.serviceAreas}
                onChange={(e) => setSupplierForm((f) => ({ ...f, serviceAreas: e.target.value }))}
                className={inputCls}
                required
              />
            </Field>
          </>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-11 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Setting up your account...
            </>
          ) : (
            <>
              Continue to Dashboard <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  'w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-shadow';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
