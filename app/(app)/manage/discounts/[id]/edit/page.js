import DiscountForm from '../../discount';

export default async function EditDiscountPage({ params }) {
  const { id } = await params;
  
  return <DiscountForm mode="edit" discountId={id} />;
} 