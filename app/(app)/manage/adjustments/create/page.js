'use client';

import { useRouter } from 'next/navigation';
import DiscountForm from '@/components/discounts/discount-form';

export default function CreateDiscountPage() {
  const router = useRouter();
  
  return (
    <DiscountForm 
      mode="create"
      onSuccess={() => router.push('/manage/adjustments')}
      onCancel={() => router.back()}
    />
  );
}
