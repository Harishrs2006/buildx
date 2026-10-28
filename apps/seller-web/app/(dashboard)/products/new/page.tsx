import { ProductForm } from '../../../../components/ProductForm';
import { PageHead } from '../../../../components/ui';

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Catalogue" title="List a product" />
      <ProductForm />
    </div>
  );
}
