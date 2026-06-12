'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AlertCircle, CheckCircle, XCircle, Clock, Package, Star } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  status: string;
  isFeatured: boolean;
  createdAt: string;
  category: { name: string };
  supplier: { businessName: string };
  images: { url: string }[];
}

const STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED'];
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'text-yellow-600 bg-yellow-50',
  ACTIVE: 'text-green-600 bg-green-50',
  INACTIVE: 'text-gray-600 bg-gray-100',
  OUT_OF_STOCK: 'text-red-600 bg-red-50',
  DISCONTINUED: 'text-gray-400 bg-gray-50',
};

export default function AdminProductsPage() {
  const { getToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('DRAFT');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { fetchProducts(); }, [page, statusFilter]);

  async function fetchProducts() {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/products?status=${statusFilter}&page=${page}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data.data.products ?? []);
      setTotal(data.data.total ?? 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string, isFeatured?: boolean) {
    setUpdating(id);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/products/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(isFeatured !== undefined && { isFeatured }) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? 'Update failed');
      }
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} products</p>
        </div>

        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Package className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">No {statusFilter.toLowerCase()} products</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {product.images[0] ? (
                        <img src={product.images[0].url} alt={product.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate max-w-[180px]">{product.name}</p>
                        {product.isFeatured && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-500">
                            <Star className="w-3 h-3 fill-amber-400" /> Featured
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{product.supplier?.businessName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{product.category?.name}</td>
                  <td className="px-4 py-3 font-medium text-foreground">₹{product.basePrice.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[product.status] ?? ''}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {product.status === 'DRAFT' && (
                        <button
                          onClick={() => updateStatus(product.id, 'ACTIVE')}
                          disabled={updating === product.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          title="Approve"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      )}
                      {product.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={() => updateStatus(product.id, product.status, !product.isFeatured)}
                            disabled={updating === product.id}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${product.isFeatured ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                            title={product.isFeatured ? 'Unfeature' : 'Feature'}
                          >
                            <Star className="w-3.5 h-3.5" />
                            {product.isFeatured ? 'Unfeature' : 'Feature'}
                          </button>
                          <button
                            onClick={() => updateStatus(product.id, 'INACTIVE')}
                            disabled={updating === product.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Deactivate
                          </button>
                        </>
                      )}
                      {product.status === 'INACTIVE' && (
                        <button
                          onClick={() => updateStatus(product.id, 'ACTIVE')}
                          disabled={updating === product.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= total}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
