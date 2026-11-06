import type { Metadata } from 'next';

// Designs load in the browser (they change as suppliers edit them); the page keeps its own address
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: 'Interior design',
    alternates: { canonical: `/designs/${id}` },
  };
}

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return children;
}
