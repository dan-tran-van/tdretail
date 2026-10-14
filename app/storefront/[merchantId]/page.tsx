'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { StorefrontView } from '@/components/StorefrontView';

function StorefrontContent() {
  const params = useParams();
  const merchantId = (params?.merchantId as string) || 'merchant_music';

  const resolvedId =
    merchantId === 'music'
      ? 'merchant_music'
      : merchantId === 'groceries'
      ? 'merchant_grocery'
      : merchantId;

  return <StorefrontView merchantId={resolvedId} />;
}

export default function DynamicStorefrontPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 max-w-6xl w-full mx-auto p-12 text-center text-muted-foreground text-sm">
          Loading storefront...
        </div>
      }
    >
      <StorefrontContent />
    </Suspense>
  );
}
