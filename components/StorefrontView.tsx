'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Disc,
  ShoppingBag,
  Package,
  Sparkles,
  ExternalLink,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Truck,
  Download,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Merchant, Order, Customer } from '@/lib/types';

interface StorefrontProps {
  merchantId: string;
}

export function StorefrontView({ merchantId }: StorefrontProps) {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // New ticket dialog
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [selectedOrderForSupport, setSelectedOrderForSupport] = useState<Order | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Quick purchase simulation
  const [isSimulatingPurchase, setIsSimulatingPurchase] = useState(false);

  const loadStorefrontData = async () => {
    try {
      setLoading(true);

      // 1. Merchant
      const mRes = await fetch(`/api/merchants/${merchantId}`);
      if (mRes.ok) {
        const mData = await mRes.json();
        setMerchant(mData.merchant);
      }

      // 2. Customer
      const sRes = await fetch('/api/session');
      if (sRes.ok) {
        const sData = await sRes.json();
        setCustomer(sData.customer);
      }

      // 3. Orders for this merchant & customer
      const oRes = await fetch(`/api/orders?merchantId=${merchantId}`);
      if (oRes.ok) {
        const oData = await oRes.json();
        setOrders(oData.orders || []);
      }
    } catch (err) {
      console.error('Error loading storefront data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStorefrontData();
  }, [merchantId]);

  const openSupportForOrder = (order: Order) => {
    setSelectedOrderForSupport(order);
    setTicketSubject(`Inquiry regarding order #${order.orderId}`);
    setTicketMessage(
      merchant?.category === 'digital_music'
        ? `I have a question about my download access and license key for ${order.items[0]?.title || 'my purchase'}.`
        : `Could you check the live delivery status and temperature container for order #${order.orderId}?`
    );
    setIsTicketDialogOpen(true);
  };

  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim() || isSubmittingTicket) return;
    setIsSubmittingTicket(true);

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId,
          orderId: selectedOrderForSupport?.orderId,
          subject: ticketSubject.trim(),
          initialMessage: ticketMessage.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsTicketDialogOpen(false);
        router.push(`/chat/${data.conversation.id}`);
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Simulate placing a new order
  const handleSimulateNewOrder = async () => {
    setIsSimulatingPurchase(true);
    try {
      const isMusic = merchantId === 'merchant_music';
      const randomId = Math.floor(1000 + Math.random() * 9000);

      const items = isMusic
        ? [
            {
              id: `item_${Date.now()}`,
              title: 'Hyperdrive Synthwave EP (24-bit FLAC)',
              artistOrBrand: 'LazerHawk Remasters',
              quantity: 1,
              unitPrice: 16.50,
              itemType: 'digital_audio' as const,
              formatOrWeight: 'FLAC 96kHz + Digital Booklet',
              licenseKey: `SW-HYPER-${randomId}-KEY`,
              downloadUrl: `https://downloads.soundwave.store/vault/HYPER-${randomId}.zip`,
            },
          ]
        : [
            {
              id: `item_${Date.now()}`,
              title: 'Artisan Gourmet Breakfast Box',
              artistOrBrand: 'Organic Valley Farms',
              quantity: 1,
              unitPrice: 28.75,
              itemType: 'perishable' as const,
              formatOrWeight: 'Fresh pasture eggs, farm butter, berries',
            },
          ];

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId,
          orderId: `ORD-${isMusic ? 'MUS' : 'GROC'}-${randomId}`,
          items,
          orderStatus: isMusic ? 'delivered' : 'out_for_delivery',
          orderStatusDisplay: isMusic
            ? 'Download Ready & License Active'
            : 'Out for Delivery (Courier Assigned)',
          totalAmount: isMusic ? 16.50 : 28.75,
          estimatedDelivery: isMusic ? 'Immediate Digital Access' : 'Today in ~35 mins',
        }),
      });

      if (res.ok) {
        await loadStorefrontData();
      }
    } catch (err) {
      console.error('Simulate purchase error:', err);
    } finally {
      setIsSimulatingPurchase(false);
    }
  };

  const isMusic = merchantId === 'merchant_music';

  if (loading) {
    return (
      <div className="flex-1 max-w-6xl w-full mx-auto p-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm">Loading storefront...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Merchant Header Hero */}
      <div className="rounded-3xl p-6 sm:p-8 border border-border bg-card text-card-foreground shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                {isMusic ? <Disc className="h-6 w-6" /> : <ShoppingBag className="h-6 w-6" />}
              </div>
              <Badge
                variant="outline"
                className="uppercase tracking-wider text-[10px]"
              >
                Simulated Merchant Storefront
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {merchant?.name}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{merchant?.description}</p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Verified TD Retail Partner</span>
              </span>
              <span>•</span>
              <span>Support: {merchant?.supportEmail}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSimulateNewOrder}
              disabled={isSimulatingPurchase}
              className="gap-2 text-xs font-semibold shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>{isSimulatingPurchase ? 'Processing...' : 'Simulate New Purchase'}</span>
            </Button>

            <NextLink href="/inbox">
              <Button
                variant="outline"
                className="text-xs bg-white/10 hover:bg-white/20 text-white border-white/30 gap-1.5"
              >
                <span>View in TD Inbox</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </NextLink>
          </div>
        </div>
      </div>

      {/* Customer Order History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Your Orders with {merchant?.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              Signed in as <span className="font-semibold text-foreground">{customer?.name}</span> ({customer?.email}).
              Click "Get Support" to test grounded Gemini agent resolution.
            </p>
          </div>

          <Badge variant="outline" className="text-xs font-mono">
            {orders.length} Orders Found
          </Badge>
        </div>

        {orders.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p className="text-sm">No orders found on this storefront for your account.</p>
            <Button
              onClick={handleSimulateNewOrder}
              size="sm"
              variant="outline"
              className="mt-3 text-xs"
            >
              Simulate Placing an Order
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => {
              const isDelivered = order.orderStatus === 'delivered';
              const isOutForDelivery = order.orderStatus === 'out_for_delivery';
              const isProcessing = order.orderStatus === 'processing';
              const isRefunded = order.orderStatus === 'refunded';

              return (
                <Card
                  key={order.orderId}
                  className="border-border/80 hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <CardHeader className="p-4 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground">
                        #{order.orderId}
                      </span>
                      <Badge
                        variant={isDelivered ? 'default' : isRefunded ? 'destructive' : 'secondary'}
                        className="text-[10px]"
                      >
                        {order.orderStatusDisplay}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-xs flex items-center justify-between">
                          <span className="font-medium text-foreground truncate max-w-[180px]">
                            {item.title}
                          </span>
                          <span className="text-muted-foreground">
                            {item.quantity}x • ${item.unitPrice.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Total Paid:</span>
                        <span className="font-semibold text-foreground">
                          ${order.totalAmount.toFixed(2)} {order.currency}
                        </span>
                      </div>
                      {order.estimatedDelivery && (
                        <div className="flex justify-between">
                           <span>Fulfillment:</span>
                          <span className="truncate max-w-[160px]">{order.estimatedDelivery}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => openSupportForOrder(order)}
                      size="sm"
                      className="w-full text-xs gap-1.5 shadow-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Get Support on this Order</span>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Embedded TD Support Widget Floating Mock */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground">
              TD Retail Embedded Support Integration
            </h4>
            <p className="text-xs text-muted-foreground">
              Participating merchants embed the TD Retail widget on their sites, providing customer-centric support that synchronizes across all participating merchants.
            </p>
          </div>
        </div>

        <NextLink href="/inbox">
          <Button variant="secondary" size="sm" className="text-xs gap-1.5 whitespace-nowrap">
            <span>Open Consolidated Inbox</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </NextLink>
      </div>

      {/* Support Inquiry Dialog */}
      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Contact {merchant?.name} Support</span>
            </DialogTitle>
            <DialogDescription>
              Your request will be grounded with verified order data and routed to the merchant's Gemini resolution agent.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSupportTicket} className="space-y-4 pt-2">
            {selectedOrderForSupport && (
              <div className="p-2.5 rounded-lg border border-border bg-muted/40 font-mono text-xs space-y-1">
                <div className="font-bold text-foreground">
                  Order #{selectedOrderForSupport.orderId}
                </div>
                <div className="text-muted-foreground">
                  Status: {selectedOrderForSupport.orderStatusDisplay}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Subject</label>
              <input
                type="text"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                required
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Your Question or Issue</label>
              <textarea
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                rows={3}
                required
                className="w-full rounded-lg border border-border bg-background p-3 text-xs resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsTicketDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingTicket}
                className="bg-primary text-primary-foreground gap-2"
              >
                {isSubmittingTicket ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span>Launch Gemini Support Chat</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
