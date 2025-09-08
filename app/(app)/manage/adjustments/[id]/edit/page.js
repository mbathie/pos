'use client';

import { useRouter } from 'next/navigation';
import { use } from 'react';
import DiscountFormV2 from '@/components/discounts/discount-form-v2';

export default function EditDiscountPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  
  return (
    <DiscountFormV2 
      mode="edit" 
      discountId={id}
      onSuccess={() => router.push('/manage/adjustments')}
      onCancel={() => router.back()}
      onDelete={() => router.push('/manage/adjustments')}
      showHeader={true}
    />
  );
}
