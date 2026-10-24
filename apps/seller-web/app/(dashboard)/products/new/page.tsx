import { ProductForm } from '../../../../components/ProductForm';

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-headline text-2xl font-bold text-on-surface">Add a product</h1>
      <ProductForm />
    </div>
  );
}
