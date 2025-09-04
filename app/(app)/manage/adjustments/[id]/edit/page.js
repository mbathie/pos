'use client';

import { useRouter } from 'next/navigation';
import { use } from 'react';
import DiscountForm from '@/components/discounts/discount-form';

export default function EditDiscountPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  
  return (
    <DiscountForm 
      mode="edit" 
      discountId={id}
      onSuccess={() => router.push('/manage/adjustments')}
      onCancel={() => router.back()}
      showHeader={true}
    />
  );
}
