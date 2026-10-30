'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { ApiClientError, useApiClient, type ApiClient } from '@buildx/web-core';
import { fetchSupplierProfile, supplierProfileSchema, type SupplierProfile } from './auth';

export type BusinessType = 'RETAILER' | 'DEALER' | 'DISTRIBUTOR' | 'MANUFACTURER';

export const BUSINESS_TYPES: { value: BusinessType; label: string; hint: string }[] = [
  { value: 'RETAILER', label: 'Retail shop', hint: 'Hardware or building materials store selling to builders and homeowners' },
  { value: 'DEALER', label: 'Authorised dealer', hint: 'Dealer or stockist for one or more brands' },
  { value: 'DISTRIBUTOR', label: 'Distributor', hint: 'Supplies dealers and large sites in bulk' },
  { value: 'MANUFACTURER', label: 'Manufacturer', hint: 'Makes the material: kiln, crusher, block plant, factory' },
];

export type ProfileUpdate = Partial<{
  businessName: string;
  whatsappNumber: string;
  businessType: BusinessType;
  gstin: string;
  address: string;
  categories: string[];
  brands: string[];
}>;

export async function updateSupplierProfile(client: ApiClient, update: ProfileUpdate): Promise<SupplierProfile> {
  return client.request('/suppliers/me', { method: 'PATCH', auth: true, envelope: true, schema: supplierProfileSchema, body: update });
}

export async function addServicePincodes(client: ApiClient, pincodes: string[]): Promise<void> {
  await client.request('/suppliers/me/service-pincodes', {
    method: 'POST', auth: true, envelope: true, body: { pincodes },
    schema: z.object({ added: z.array(z.string()), count: z.number() }).passthrough(),
  });
}

export async function removeServicePincode(client: ApiClient, pincode: string): Promise<void> {
  await client.request(`/suppliers/me/service-pincodes/${pincode}`, {
    method: 'DELETE', auth: true, envelope: true, schema: z.object({ pincode: z.string() }).passthrough(),
  });
}

const REJECT_REASON: Record<string, string> = {
  MALFORMED: 'is not a 6-digit PIN code',
  NOT_FOUND: 'is not in the India Post directory',
  NO_DELIVERY_OFFICE: 'has no delivery post office',
};

// Turns the API's per-PIN rejection list into one readable sentence
/** The PINs the API refused, each with a readable reason (empty when the error was something else) */
export function rejectedPincodes(err: unknown): { pincode: string; text: string }[] {
  if (!(err instanceof ApiClientError) || !Array.isArray(err.details)) return [];
  return (err.details as { pincode?: string; reason?: string }[])
    .filter((d): d is { pincode: string; reason?: string } => !!d.pincode)
    .map((d) => ({ pincode: d.pincode, text: `${d.pincode} ${REJECT_REASON[d.reason ?? ''] ?? 'was rejected'}` }));
}

export function describePincodeError(err: unknown): string {
  const bad = rejectedPincodes(err);
  if (bad.length) return `${bad.map((b) => b.text).join('; ')}.`;
  return err instanceof Error ? err.message : 'Could not add the PIN codes. Try again.';
}

// What still has to be done before products can be listed
export function setupGaps(p: SupplierProfile | null) {
  if (!p) return { business: true, area: true, range: true };
  return {
    business: !p.businessType,
    area: (p.servicePincodes ?? []).length === 0,
    range: (p.categories ?? []).length === 0,
  };
}

export function isSetupComplete(p: SupplierProfile | null): boolean {
  const g = setupGaps(p);
  return !g.business && !g.area && !g.range;
}

export function useSupplierProfile() {
  const client = useApiClient();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'success'; profile: SupplierProfile } | { status: 'error' }>({ status: 'loading' });
  const [key, setKey] = useState(0);
  useEffect(() => {
    let live = true;
    fetchSupplierProfile(client)
      .then((profile) => live && setState({ status: 'success', profile }))
      .catch(() => live && setState({ status: 'error' }));
    return () => { live = false; };
  }, [client, key]);
  const reload = useCallback(() => setKey((k) => k + 1), []);
  const replace = useCallback((profile: SupplierProfile) => setState({ status: 'success', profile }), []);
  return { ...state, reload, replace };
}
