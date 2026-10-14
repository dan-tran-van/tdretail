import fs from 'fs';
import path from 'path';
import {
  Merchant,
  Customer,
  Order,
  Conversation,
  Message,
  OutboxEmail,
} from '@/lib/types';
import {
  SEED_CUSTOMERS,
  SEED_MERCHANTS,
  SEED_ORDERS,
  SEED_CONVERSATIONS,
  SEED_MESSAGES,
} from '@/lib/data/seedData';
import { initFirebaseAdmin } from './admin';

interface StorageSchema {
  merchants: Record<string, Merchant>;
  customers: Record<string, Customer>;
  orders: Record<string, Order>;
  conversations: Record<string, Conversation>;
  messages: Record<string, Message[]>; // keyed by conversationId
  outbox: OutboxEmail[];
}

// In-memory cache + file persistence fallback
let memoryState: StorageSchema | null = null;
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {
      // Ignore if cannot write to filesystem (e.g. read-only env)
    }
  }
}

function getDefaultState(): StorageSchema {
  const merchants: Record<string, Merchant> = {};
  for (const m of SEED_MERCHANTS) {
    merchants[m.id] = m;
  }

  const customers: Record<string, Customer> = {};
  for (const c of SEED_CUSTOMERS) {
    customers[c.id] = c;
  }

  const orders: Record<string, Order> = {};
  for (const o of SEED_ORDERS) {
    orders[o.orderId] = o;
  }

  const conversations: Record<string, Conversation> = {};
  for (const conv of SEED_CONVERSATIONS) {
    conversations[conv.id] = conv;
  }

  const messages: Record<string, Message[]> = {};
  for (const [convId, msgs] of Object.entries(SEED_MESSAGES)) {
    messages[convId] = [...msgs];
  }

  return {
    merchants,
    customers,
    orders,
    conversations,
    messages,
    outbox: [],
  };
}

function loadState(): StorageSchema {
  if (memoryState) return memoryState;

  ensureDataDir();
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      memoryState = JSON.parse(data) as StorageSchema;
      return memoryState;
    } catch (err) {
      console.warn('[Store] Failed to read db.json, generating default seed state:', err);
    }
  }

  memoryState = getDefaultState();
  saveState();
  return memoryState;
}

function saveState() {
  if (!memoryState) return;
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryState, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Store] Could not persist state to file, retaining in-memory:', err);
  }
}

export class TDStore {
  // Check if real Firestore should be used
  private static async getFirestoreClient() {
    const { firestore, isConfigured } = initFirebaseAdmin();
    return isConfigured && firestore ? firestore : null;
  }

  // --- Seed / Reset ---
  static async seed(force = false): Promise<{ message: string; counts: Record<string, number> }> {
    const firestore = await this.getFirestoreClient();
    if (firestore) {
      // Seed Firestore directly
      const batch = firestore.batch();

      for (const m of SEED_MERCHANTS) {
        batch.set(firestore.collection('merchants').doc(m.id), m, { merge: !force });
      }
      for (const c of SEED_CUSTOMERS) {
        batch.set(firestore.collection('customers').doc(c.id), c, { merge: !force });
      }
      for (const o of SEED_ORDERS) {
        batch.set(firestore.collection('orders').doc(o.orderId), o, { merge: !force });
      }
      for (const conv of SEED_CONVERSATIONS) {
        batch.set(firestore.collection('conversations').doc(conv.id), conv, { merge: !force });
      }
      for (const [convId, msgs] of Object.entries(SEED_MESSAGES)) {
        for (const msg of msgs) {
          batch.set(firestore.collection('conversations').doc(convId).collection('messages').doc(msg.id), msg, { merge: !force });
        }
      }

      await batch.commit();
      console.log('[Store] Seeded Firestore with initial merchants, customers, orders, and conversations.');
    }

    // Always reset/update local cache as well
    memoryState = getDefaultState();
    saveState();

    return {
      message: 'Database seeded successfully',
      counts: {
        merchants: Object.keys(memoryState.merchants).length,
        customers: Object.keys(memoryState.customers).length,
        orders: Object.keys(memoryState.orders).length,
        conversations: Object.keys(memoryState.conversations).length,
      },
    };
  }

  // --- Merchants ---
  static async getMerchants(): Promise<Merchant[]> {
    const firestore = await this.getFirestoreClient();
    if (firestore) {
      try {
        const snap = await firestore.collection('merchants').get();
        if (!snap.empty) {
          return snap.docs.map((d) => d.data() as Merchant);
        }
      } catch (e) {
        console.warn('[Store] Firestore read error for merchants, falling back to local:', e);
      }
    }
    const state = loadState();
    return Object.values(state.merchants);
  }

  static async getMerchantById(id: string): Promise<Merchant | null> {
    const firestore = await this.getFirestoreClient();
    if (firestore) {
      try {
        const doc = await firestore.collection('merchants').doc(id).get();
        if (doc.exists) return doc.data() as Merchant;
      } catch (e) {
        console.warn(`[Store] Firestore error fetching merchant ${id}:`, e);
      }
    }
    const state = loadState();
    return state.merchants[id] || null;
  }

  // --- Customers ---
  static async getCustomer(id: string): Promise<Customer | null> {
    const state = loadState();
    return state.customers[id] || null;
  }

  static async getCustomerByEmail(email: string): Promise<Customer | null> {
    const state = loadState();
    const found = Object.values(state.customers).find(
      (c) => c.email.toLowerCase() === email.toLowerCase()
    );
    return found || null;
  }

  // --- Orders ---
  static async getOrders(customerId?: string, merchantId?: string): Promise<Order[]> {
    const firestore = await this.getFirestoreClient();
    if (firestore) {
      try {
        let query: FirebaseFirestore.Query = firestore.collection('orders');
        if (customerId) query = query.where('customerId', '==', customerId);
        if (merchantId) query = query.where('merchantId', '==', merchantId);
        const snap = await query.get();
        if (!snap.empty) {
          return snap.docs.map((d) => d.data() as Order);
        }
      } catch (e) {
        console.warn('[Store] Firestore error fetching orders:', e);
      }
    }

    const state = loadState();
    return Object.values(state.orders).filter((o) => {
      if (customerId && o.customerId !== customerId) return false;
      if (merchantId && o.merchantId !== merchantId) return false;
      return true;
    });
  }

  static async getOrderById(orderId: string): Promise<Order | null> {
    const firestore = await this.getFirestoreClient();
    if (firestore) {
      try {
        const doc = await firestore.collection('orders').doc(orderId).get();
        if (doc.exists) return doc.data() as Order;
      } catch (e) {
        console.warn(`[Store] Firestore error fetching order ${orderId}:`, e);
      }
    }

    const state = loadState();
    // Normalize orderId (e.g. trim, uppercase)
    const normalized = orderId.trim().toUpperCase();
    for (const key of Object.keys(state.orders)) {
      if (key.toUpperCase() === normalized || state.orders[key].orderId.toUpperCase() === normalized) {
        return state.orders[key];
      }
    }
    return null;
  }

  // --- Conversations ---
  static async getConversations(customerId?: string, merchantId?: string): Promise<Conversation[]> {
    const firestore = await this.getFirestoreClient();
    if (firestore) {
      try {
        let query: FirebaseFirestore.Query = firestore.collection('conversations');
        if (customerId) query = query.where('customerId', '==', customerId);
        if (merchantId) query = query.where('merchantId', '==', merchantId);
        const snap = await query.get();
        if (!snap.empty) {
          const list = snap.docs.map((d) => d.data() as Conversation);
          return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
      } catch (e) {
        console.warn('[Store] Firestore error fetching conversations:', e);
      }
    }

    const state = loadState();
    const convs = Object.values(state.conversations).filter((c) => {
      if (customerId && c.customerId !== customerId) return false;
      if (merchantId && c.merchantId !== merchantId) return false;
      return true;
    });

    return convs.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  static async getConversationById(id: string): Promise<Conversation | null> {
    const firestore = await this.getFirestoreClient();
    if (firestore) {
      try {
        const doc = await firestore.collection('conversations').doc(id).get();
        if (doc.exists) return doc.data() as Conversation;
      } catch (e) {
        console.warn(`[Store] Firestore error fetching conversation ${id}:`, e);
      }
    }

    const state = loadState();
    return state.conversations[id] || null;
  }

  static async createConversation(conv: Conversation): Promise<Conversation> {
    const firestore = await this.getFirestoreClient();
    if (firestore) {
      try {
        await firestore.collection('conversations').doc(conv.id).set(conv);
      } catch (e) {
        console.warn('[Store] Firestore write error for new conversation:', e);
      }
    }

    const state = loadState();
    state.conversations[conv.id] = conv;
    if (!state.messages[conv.id]) {
      state.messages[conv.id] = [];
    }
    saveState();
    return conv;
  }

  static async updateConversation(
    id: string,
    updates: Partial<Conversation>
  ): Promise<Conversation | null> {
    const firestore = await this.getFirestoreClient();
    if (firestore) {
      try {
        await firestore.collection('conversations').doc(id).update({
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn(`[Store] Firestore update error for conversation ${id}:`, e);
      }
    }

    const state = loadState();
    if (!state.conversations[id]) return null;

    state.conversations[id] = {
      ...state.conversations[id],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveState();
    return state.conversations[id];
  }

  // --- Messages ---
  static async getMessages(conversationId: string): Promise<Message[]> {
    const firestore = await this.getFirestoreClient();
    if (firestore) {
      try {
        const snap = await firestore
          .collection('conversations')
          .doc(conversationId)
          .collection('messages')
          .orderBy('timestamp', 'asc')
          .get();
        if (!snap.empty) {
          return snap.docs.map((d) => d.data() as Message);
        }
      } catch (e) {
        console.warn(`[Store] Firestore error fetching messages for ${conversationId}:`, e);
      }
    }

    const state = loadState();
    return state.messages[conversationId] || [];
  }

  static async addMessage(message: Message): Promise<Message> {
    const firestore = await this.getFirestoreClient();
    if (firestore) {
      try {
        await firestore
          .collection('conversations')
          .doc(message.conversationId)
          .collection('messages')
          .doc(message.id)
          .set(message);
      } catch (e) {
        console.warn('[Store] Firestore write error for message:', e);
      }
    }

    const state = loadState();
    if (!state.messages[message.conversationId]) {
      state.messages[message.conversationId] = [];
    }
    state.messages[message.conversationId].push(message);

    // Update conversation snippet and timestamp
    if (state.conversations[message.conversationId]) {
      state.conversations[message.conversationId].lastMessageSnippet =
        message.content.length > 90 ? message.content.slice(0, 90) + '...' : message.content;
      state.conversations[message.conversationId].lastMessageSender = message.sender;
      state.conversations[message.conversationId].lastMessageAt = message.timestamp;
      state.conversations[message.conversationId].updatedAt = message.timestamp;
      if (message.sender === 'ai' || message.sender === 'human_agent') {
        state.conversations[message.conversationId].unreadByCustomer = true;
      }
    }

    saveState();
    return message;
  }

  // --- Outbox Emails ---
  static async addOutboxEmail(email: OutboxEmail): Promise<OutboxEmail> {
    const firestore = await this.getFirestoreClient();
    if (firestore) {
      try {
        await firestore.collection('outbox_emails').doc(email.id).set(email);
      } catch (e) {
        console.warn('[Store] Firestore write error for outbox email:', e);
      }
    }

    const state = loadState();
    state.outbox.unshift(email);
    saveState();
    return email;
  }

  static async getOutboxEmails(): Promise<OutboxEmail[]> {
    const firestore = await this.getFirestoreClient();
    if (firestore) {
      try {
        const snap = await firestore
          .collection('outbox_emails')
          .orderBy('sentAt', 'desc')
          .limit(50)
          .get();
        if (!snap.empty) {
          return snap.docs.map((d) => d.data() as OutboxEmail);
        }
      } catch (e) {
        console.warn('[Store] Firestore error fetching outbox:', e);
      }
    }

    const state = loadState();
    return state.outbox || [];
  }
}
