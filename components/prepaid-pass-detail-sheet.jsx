'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Package, Hash, CalendarDays, Ticket, Clock } from 'lucide-react';
import dayjs from 'dayjs';

function getInitials(name) {
  if (!name) return 'UN';
  return name.split(' ').map(w => w.charAt(0).toUpperCase()).join('').slice(0, 2);
}

export default function PrepaidPassDetailSheet({ pass, open, onOpenChange }) {
  if (!pass) return null;

  const remaining = pass.remainingPasses ?? 0;
  const total = pass.totalPasses ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Prepaid Pass Details</SheetTitle>
          <SheetDescription>View pass information and redemption history</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Customer Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {pass.customer?.photo ? (
                <AvatarImage src={pass.customer.photo} alt={pass.customer.name} />
              ) : (
                <AvatarFallback className="bg-primary/10">
                  {getInitials(pass.customer?.name)}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <div className="font-medium">{pass.customer?.name || 'Unknown'}</div>
              <div className="text-sm text-muted-foreground">{pass.customer?.email || '-'}</div>
            </div>
          </div>

          <Separator />

          {/* Pass Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Package className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Pack</div>
                <div className="text-sm font-medium">{pass.pack?.name || 'Unknown'}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Ticket className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <Badge variant={pass.status === 'active' ? 'default' : pass.status === 'expired' ? 'destructive' : 'secondary'}>
                  {pass.status}
                </Badge>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Hash className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Remaining / Total</div>
                <div className="text-sm font-medium">{remaining} / {total}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="text-sm font-medium">{dayjs(pass.createdAt).format('DD/MM/YYYY')}</div>
              </div>
            </div>
            {pass.expiresAt && (
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Expires</div>
                  <div className="text-sm font-medium">{dayjs(pass.expiresAt).format('DD/MM/YYYY')}</div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Code</div>
            <code className="text-sm bg-muted px-2 py-1 rounded">{pass.code}</code>
          </div>

          <Separator />

          {/* Redeemable Products */}
          {pass.products && pass.products.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Redeemable Products</div>
              <div className="flex flex-wrap gap-1">
                {pass.products.map((p, i) => (
                  <Badge key={i} variant="outline">{p.name}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Redemption History */}
          <div>
            <div className="text-sm font-medium mb-2">Redemption History</div>
            {(!pass.redemptions || pass.redemptions.length === 0) ? (
              <p className="text-sm text-muted-foreground">No redemptions yet</p>
            ) : (
              <div className="space-y-3">
                {pass.redemptions.map((r, i) => (
                  <div key={i} className="flex items-start justify-between text-sm border rounded-md p-3">
                    <div>
                      <div className="font-medium">{dayjs(r.date).format('DD/MM/YYYY h:mm A')}</div>
                      <div className="text-muted-foreground">
                        {r.products?.map(p => p.name).join(', ') || 'Unknown product'}
                      </div>
                    </div>
                    <Badge variant="secondary">{r.count} used</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
