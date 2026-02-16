'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductThumbnail } from '@/components/product-thumbnail';
import { Package, Ticket } from 'lucide-react';
import { IconButton } from '@/components/control-button';
import { calcCartValuePrepaid } from '@/lib/product';

export default function PrepaidSheet({ open, onOpenChange, prepaid, onAddToCart }) {
  const [priceQuantities, setPriceQuantities] = useState({});

  // Reset quantities when a different pack is opened
  useEffect(() => {
    setPriceQuantities({});
  }, [prepaid?._id]);

  if (!prepaid) return null;

  const packPasses = prepaid.passes || 0;

  // Use prices array if available, fallback to legacy amount
  const prices = prepaid.prices?.length
    ? prepaid.prices
    : (prepaid.amount != null)
      ? [{ name: 'Standard', value: prepaid.amount, minor: false }]
      : [];

  const totalQty = Object.values(priceQuantities).reduce((sum, q) => sum + q, 0);
  const subtotal = prices.reduce((sum, price, idx) => {
    const qty = priceQuantities[idx] || 0;
    return sum + qty * (parseFloat(price.value) || 0);
  }, 0);

  const handleAddToCart = async () => {
    if (!onAddToCart || totalQty === 0) return;

    const pricesWithQty = prices
      .map((price, idx) => ({
        ...price,
        qty: priceQuantities[idx] || 0
      }))
      .filter(p => p.qty > 0);

    const cartProduct = {
      _id: prepaid._id,
      name: prepaid.name,
      type: 'prepaid',
      thumbnail: prepaid.thumbnail,
      waiverRequired: prepaid.waiverRequired || false,
      passes: packPasses,
      products: (prepaid.products || []).map(p => ({
        _id: p._id,
        name: p.name,
        thumbnail: p.thumbnail
      })),
      prices: pricesWithQty
    };

    const calculated = await calcCartValuePrepaid({ product: cartProduct });
    onAddToCart(calculated);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] flex flex-col h-full">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-3">
            <ProductThumbnail
              src={prepaid.thumbnail}
              alt={prepaid.name}
              size="md"
              fallbackIcon={Package}
            />
            <div className="flex-1">
              <div className="text-xl font-semibold">{prepaid.name}</div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 px-4">
            {prepaid.description && (
              <p className="text-sm text-muted-foreground">{prepaid.description}</p>
            )}

            {/* Price Quantity Selectors */}
            <div className="space-y-2">
              {prices.map((price, priceIdx) => {
                const qty = priceQuantities[priceIdx] || 0;
                return (
                  <div key={priceIdx} className="flex items-center gap-2">
                    <IconButton
                      icon="minus"
                      onClick={() => {
                        setPriceQuantities(prev => ({
                          ...prev,
                          [priceIdx]: Math.max(0, (prev[priceIdx] || 0) - 1)
                        }));
                      }}
                      disabled={qty === 0}
                    />
                    <IconButton
                      icon="plus"
                      onClick={() => {
                        setPriceQuantities(prev => ({
                          ...prev,
                          [priceIdx]: (prev[priceIdx] || 0) + 1
                        }));
                      }}
                    />
                    <span className="flex-1">
                      {price.name || 'Standard'}
                      {price.minor && (
                        <Badge variant="secondary" className="text-xs ml-1">Minor</Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({packPasses} {packPasses === 1 ? 'pass' : 'passes'})
                      </span>
                    </span>
                    <span className="w-8 text-center">{qty}x</span>
                    <span className="w-16 text-right">${parseFloat(price.value || 0).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {prepaid.products && prepaid.products.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-sm font-medium">Redeemable Products</div>
                {prepaid.products.map((product) => (
                  <div
                    key={product._id}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <ProductThumbnail
                      src={product.thumbnail || product.image}
                      alt={product.name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{product.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="pt-4 border-t">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center">
              <div className="uppercase">total</div>
              <div className="ml-auto">
                ${subtotal.toFixed(2)}
              </div>
            </div>
            <Button
              onClick={handleAddToCart}
              className="w-full cursor-pointer"
              size="lg"
              disabled={totalQty === 0}
            >
              Add to Cart
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
