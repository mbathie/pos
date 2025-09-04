'use client';

import Discounts from '@/components/discounts/discounts';
import { useRouter } from 'next/navigation';

export default function AdjustmentsPage() {
  const router = useRouter();
  return (
    <Discounts
      panelLook={true}
      showHeader={true}
      showActions={true}
      onRowClick={(discount) => router.push(`/manage/adjustments/${discount._id}/edit`)}
    />
  );
}
