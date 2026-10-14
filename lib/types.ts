export type MerchantCategory = 'digital_music' | 'groceries' | 'general';

export type SupportMode = 'hybrid_ai_human' | 'ai_first' | 'human_only';

export interface Merchant {
  id: string;
  name: string;
  slug: string;
  category: MerchantCategory;
  tagline: string;
  description: string;
  brandColor: string; // e.g. hex #6366f1 or hsl
  accentColor: string;
  iconName: string; // 'disc' | 'shopping-bag' | etc
  supportEmail: string;
  supportMode: SupportMode;
  supportPolicy: {
    returns: string;
    refunds: string;
    deliveryOrDownload: string;
    escalationThreshold: string;
  };
  demoPromptSuggestions: string[];
  storefrontUrl: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  defaultAddress?: string;
  createdAt: string;
}

export interface CustomerSession {
  sessionId: string;
  token: string;
  customer: Customer;
  createdAt: string;
  expiresAt: string;
}

export type OrderStatus =
  | 'processing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: string;
  title: string;
  artistOrBrand?: string;
  quantity: number;
  unitPrice: number;
  itemType: 'digital_audio' | 'perishable' | 'physical';
  formatOrWeight?: string; // e.g. "FLAC 24-bit / 96kHz" or "1.5 kg Organic"
  licenseKey?: string;
  downloadUrl?: string;
}

export interface Order {
  id: string; // Internal id
  orderId: string; // Customer facing ID e.g. ORD-MUS-8821
  merchantId: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  orderStatus: OrderStatus;
  orderStatusDisplay: string;
  totalAmount: number;
  currency: string;
  trackingNumber?: string;
  carrierOrCourier?: string;
  estimatedDelivery?: string;
  deliveryAddress?: string;
  courierNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConversationStatus =
  | 'active'
  | 'waiting_on_agent'
  | 'escalated'
  | 'resolved';

export interface Conversation {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  merchantId: string;
  merchantName?: string;
  orderId?: string | null;
  subject: string;
  status: ConversationStatus;
  lastMessageSnippet: string;
  lastMessageSender: MessageSender;
  lastMessageAt: string;
  unreadByCustomer: boolean;
  escalationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageSender = 'customer' | 'ai' | 'human_agent' | 'system';

export interface ToolCallExecution {
  name: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown>;
  executedAt: string;
}

export interface MessageMetadata {
  isAiGrounded?: boolean;
  toolCalls?: ToolCallExecution[];
  groundedOrderId?: string;
  groundedOrderStatus?: string;
  escalationTriggered?: boolean;
  inboundEmailId?: string;
  inboundEmailFrom?: string;
  modelName?: string;
  agentName?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: MessageSender;
  senderName: string;
  content: string;
  metadata?: MessageMetadata;
  timestamp: string;
  createdAt?: string;
}

export interface OutboxEmail {
  id: string;
  conversationId: string;
  merchantId: string;
  merchantName: string;
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  status: 'sent' | 'simulated';
  sentAt: string;
  simulatedWebhookPayload?: {
    from: string;
    to: string;
    subject: string;
    text: string;
    headers: Record<string, string>;
  };
}
