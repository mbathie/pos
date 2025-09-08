'use client';

import { useRouter } from 'next/navigation';
import DiscountFormV2 from '@/components/discounts/discount-form-v2';

export default function CreateDiscountPage() {
  const router = useRouter();
  
  return (
    <DiscountFormV2 
      mode="create"
      onSuccess={() => router.push('/manage/adjustments')}
      onCancel={() => router.back()}
    />
  );
}
