import { TDStore } from '@/lib/firebase/store';
import { Order } from '@/lib/types';

export interface OrderLookupParams {
  orderId: string;
  merchantId: string;
  customerId: string;
  customerEmail: string;
}

export interface OrderLookupResult {
  success: boolean;
  order?: {
    orderId: string;
    merchantId: string;
    orderStatus: string;
    orderStatusDisplay: string;
    items: Array<{
      title: string;
      quantity: number;
      unitPrice: number;
      formatOrWeight?: string;
      licenseKey?: string;
      downloadUrl?: string;
    }>;
    totalAmount: number;
    currency: string;
    trackingNumber?: string;
    carrierOrCourier?: string;
    estimatedDelivery?: string;
    deliveryAddress?: string;
    courierNotes?: string;
    createdAt: string;
  };
  error?: string;
}

export class OrderService {
  /**
   * Grounded server-side tool to query order status.
   * Enforces strict customer ownership and cross-merchant isolation.
   */
  static async lookupOrderStatus(params: OrderLookupParams): Promise<OrderLookupResult> {
    const { orderId, merchantId, customerId, customerEmail } = params;

    if (!orderId || !orderId.trim()) {
      return {
        success: false,
        error: 'Order ID is required to perform lookup.',
      };
    }

    const order = await TDStore.getOrderById(orderId);

    if (!order) {
      return {
        success: false,
        error: `Order with ID "${orderId}" was not found in our records. Please verify the order number on your receipt or confirmation email.`,
      };
    }

    // Security Check 1: Cross-merchant boundary check
    if (order.merchantId !== merchantId) {
      const targetMerchant = await TDStore.getMerchantById(order.merchantId);
      const merchantName = targetMerchant ? targetMerchant.name : 'another merchant';
      return {
        success: false,
        error: `Security Alert: Order "${orderId}" is registered with ${merchantName}, not the merchant for this support channel. Please open your request under ${merchantName} from your consolidated inbox.`,
      };
    }

    // Security Check 2: Customer ownership check
    const isMatchingEmail =
      order.customerEmail.toLowerCase() === customerEmail.toLowerCase();
    const isMatchingCustomer = order.customerId === customerId;

    if (!isMatchingEmail && !isMatchingCustomer) {
      return {
        success: false,
        error: `Access Denied: Order "${orderId}" is not associated with this customer account. Please check that you are signed in with the email used during checkout.`,
      };
    }

    // Grounded sanitized payload
    return {
      success: true,
      order: {
        orderId: order.orderId,
        merchantId: order.merchantId,
        orderStatus: order.orderStatus,
        orderStatusDisplay: order.orderStatusDisplay,
        items: order.items.map((i) => ({
          title: i.title,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          formatOrWeight: i.formatOrWeight,
          licenseKey: i.licenseKey,
          downloadUrl: i.downloadUrl,
        })),
        totalAmount: order.totalAmount,
        currency: order.currency,
        trackingNumber: order.trackingNumber,
        carrierOrCourier: order.carrierOrCourier,
        estimatedDelivery: order.estimatedDelivery,
        deliveryAddress: order.deliveryAddress,
        courierNotes: order.courierNotes,
        createdAt: order.createdAt,
      },
    };
  }

  static async getOrdersForCustomer(
    customerId: string,
    merchantId?: string
  ): Promise<Order[]> {
    return TDStore.getOrders(customerId, merchantId);
  }
}
