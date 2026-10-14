# TD Retail — Shared Customer Support Platform & Gemini Agent

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4-black)](https://nextjs.org/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4)](https://deepmind.google/technologies/gemini/)
[![SendGrid](https://img.shields.io/badge/SendGrid-Inbound%20Parse-00B2E3)](https://sendgrid.com/)
[![Firebase Firestore](https://img.shields.io/badge/Firebase-Admin%20Firestore-FFCA28)](https://firebase.google.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Tailwind-000000)](https://ui.shadcn.com/)

An enterprise-grade, customer-centric multi-merchant customer support resolution platform built for the **TD Retail Hackathon**. 

This platform allows shoppers who buy from separate participating merchant storefronts (such as **SoundWave Digital** for digital lossless audio and **FreshCart Direct** for organic groceries) to manage all their support conversations in a single unified inbox, resolved by a **Google Gemini AI Agent** with server-grounded order tools and bidirectional **SendGrid email reply routing**.

---

## 🌟 Key Differentiators & Features

### 1. Consolidated Customer Inbox (`/inbox`)
* **Multi-Merchant Centralization:** No more logging into separate support portals for each store. Customers view all tickets in one dashboard.
* **Domain Filtering & Search:** Instant filtering between merchants (Digital Music vs. Groceries) and ticket lifecycle states (Active, Escalated, Resolved).
* **Grounded Ticket Launcher:** Pick an order from recent merchant purchases to ground the conversation context from the very first message.

### 2. Dedicated Grounded Conversation Thread (`/chat/[conversationId]`)
* **Zero AI Hallucination:** The Gemini Agent uses server-side function calling (`lookupOrderStatus`) to query live database records before providing answers.
* **Server-Enforced Tenant Security:** The server validates session credentials, customer email, and merchant boundaries. Orders belonging to *Merchant A* can never be leaked to *Merchant B*.
* **Interactive Tool Inspector:** Judges and users can click **"Inspect Server Tool Calls"** on any AI message to view the exact function arguments, timestamp, and returned database payload.
* **Human Escalation Workflow:** Customers can click **"Request Human Assistance"**, automatically alerting the merchant support team and updating the thread status to `escalated`.
* **Live Message Stream:** 4-second auto-polling ensures customer email replies and agent actions appear live on the screen without page reloads.

### 3. Bidirectional Email Reply Routing (`/outbox` & SendGrid Webhook)
* **Direct Reply from Email Client:** Outgoing notifications include a dynamic header:
  ```http
  Reply-To: TD Retail Support <reply+{conversationId}@inbound.tdretail.example.com>
  Subject: [{MerchantName}] {Subject} [Ref: {conversationId}]
  ```
* **SendGrid Inbound Parse Webhook (`POST /api/webhooks/sendgrid`):** Ingests incoming customer email replies, parses the thread token, verifies sender email ownership, appends the message into the active conversation, triggers the Gemini Agent, and sends an email reply back to the customer!
* **Local Development Outbox Viewer (`/outbox`):** When running without SendGrid credentials, outgoing emails are captured in the outbox. An interactive **"Simulate Customer Reply"** button lets judges trigger the full round-trip webhook pipeline with one click.

### 4. Merchant Storefront Integration Demos
* **Digital Music Storefront (`/storefront/music`):** Demonstrates **SoundWave Digital** (bit-perfect 24-bit FLAC audio, artist master stems, permanent vault licenses).
* **Groceries Storefront (`/storefront/groceries`):** Demonstrates **FreshCart Direct** (farm-fresh organic groceries, cold-chain refrigerated delivery guarantee).
* **Order Support Widgets:** Embedded buttons on order cards launch directly into TD Retail with order context pre-grounded.
* **Simulate Purchase Action:** Add new real-time orders to test Gemini's tool lookups on fresh data.

---

## 🏗️ System Architecture

```
                       ┌───────────────────────────────┐
                       │   Participating Storefronts   │
                       │  (SoundWave Music, FreshCart) │
                       └───────────────┬───────────────┘
                                       │ Launches Support
                                       ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                     TD Retail Customer Platform (/inbox)                    │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │                                                                             │
 │   ┌───────────────────────┐                    ┌────────────────────────┐   │
 │   │  Consolidated Inbox   │                    │ Conversation Thread    │   │
 │   │  • Multi-Merchant UI  │ ─────────────────▶ │ • Grounded AI Bubble   │   │
 │   │  • Order Attachments  │                    │ • Tool Call Inspector  │   │
 │   └───────────────────────┘                    └───────────┬────────────┘   │
 │                                                            │                │
 └────────────────────────────────────────────────────────────┼────────────────┘
                                                              │
                       ┌──────────────────────────────────────┴───────────────┐
                       ▼                                                      ▼
        ┌─────────────────────────────┐                        ┌──────────────────────────────┐
        │   Google Gemini 2.5 Flash   │                        │   SendGrid Inbound/Outbound  │
        ├─────────────────────────────┤                        ├──────────────────────────────┤
        │ • System Prompt Injection   │                        │ • Outbound Support Emails    │
        │ • Tool: lookupOrderStatus   │                        │ • Inbound Parse Webhook      │
        │ • Tool: requestHumanEscalate│                        │ • Reply-To Thread Routing    │
        └──────────────┬──────────────┘                        └──────────────┬───────────────┘
                       │                                                      │
                       └──────────────────────┬───────────────────────────────┘
                                              ▼
                        ┌──────────────────────────────────────────┐
                        │        Firebase Admin / Firestore        │
                        ├──────────────────────────────────────────┤
                        │ • merchants      • orders                │
                        │ • customers      • conversations         │
                        │ • sessions       • messages & outbox     │
                        └──────────────────────────────────────────┘
```

---

## 🗄️ Firestore Collections Schema

| Collection | Key Fields | Description |
| :--- | :--- | :--- |
| `merchants` | `id`, `name`, `category`, `brandColor`, `supportPolicy`, `supportEmail` | Dynamic configuration for participating merchants |
| `customers` | `id`, `name`, `email`, `phone`, `defaultAddress` | Customer profile and identity |
| `sessions` | `sessionId`, `token`, `customerId`, `expiresAt` | Authenticated session records |
| `orders` | `orderId`, `merchantId`, `customerId`, `items`, `orderStatus`, `estimatedDelivery` | Shared orders database across merchant storefronts |
| `conversations` | `id`, `customerId`, `merchantId`, `orderId`, `status`, `lastMessageSnippet` | Support threads across merchants |
| `messages` | `id`, `conversationId`, `sender`, `content`, `metadata.toolCalls`, `timestamp` | Message history with AI tool grounding metadata |
| `outbox_emails` | `id`, `conversationId`, `to`, `replyTo`, `subject`, `bodyHtml`, `sentAt` | Inspection store for outgoing customer notifications |

---

## 🚀 Quickstart & Local Development

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

| Variable | Description | Default Fallback |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API Key | Automatically activates Grounded Fallback Engine |
| `SENDGRID_API_KEY` | SendGrid Mail API Key | Automatically logs to Local Outbox (`/outbox`) |
| `FIREBASE_PROJECT_ID` | Google Cloud / Firebase Project ID | Automatically persists to local store (`.data/db.json`) |

> **Zero-Barrier Setup:** TD Retail runs immediately without cloud credentials. The built-in storage adapter and deterministic grounded AI engine allow testing every feature out-of-the-box.

### 3. Start Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Hackathon Judging & Evaluation Walkthrough

Follow these steps to experience all capabilities:

### Step 1: Open the Consolidated Inbox (`/inbox`)
1. Visit [http://localhost:3000/inbox](http://localhost:3000/inbox).
2. Note the multi-merchant view showing conversations for both **SoundWave Digital** (Digital Music) and **FreshCart Direct** (Groceries).
3. Switch filters between **All Merchants**, **SoundWave Digital**, and **FreshCart Direct**.
4. Use the persona switcher in the navbar to toggle between **Sarah Connor** and **Alex Chen**.

### Step 2: Test Grounded Order Lookup in Chat (`/chat/conv_music_01`)
1. Click on the SoundWave Digital thread (`Question regarding master stems download for Neon Echoes #ORD-MUS-8821`).
2. Ask: *"What is my license key and download link for order #ORD-MUS-8821?"*
3. Observe the AI response quoting the real license key (`SW-8821-NEON-FLAC-L01`) and direct vault zip download link.
4. Click **"Inspect Server Tool Calls"** under the AI response to view the validated `lookupOrderStatus` execution.

### Step 3: Test Cross-Merchant Isolation Security
1. In the **SoundWave Digital** chat, ask: *"Can you check order #ORD-GROC-5512?"* (a FreshCart grocery order).
2. The server blocks the request with a **Security Alert**: *"Order ORD-GROC-5512 is registered with FreshCart Direct, not SoundWave Digital."*
3. This proves that merchant boundary isolation is strictly enforced server-side.

### Step 4: Test SendGrid Inbound Parse Email Routing (`/outbox`)
1. Visit [http://localhost:3000/outbox](http://localhost:3000/outbox).
2. Select any outgoing email notification.
3. Click **"Simulate Customer Reply"**, enter a reply message (e.g., *"Thanks, the FLAC stems extracted perfectly!"*), and click **"Send Inbound Webhook"**.
4. Click **"Go to thread"** to see that the email was ingested into the conversation thread without logging in, and the Gemini agent has already responded!

### Step 5: Test Human Escalation & Specialist Resolution
1. In any active chat, click **"Request Human"** or type: *"I would like to speak to a human supervisor."*
2. The ticket status updates to `escalated`, an alert is dispatched to the merchant's support email, and an audit message is recorded.
3. Open the **Hackathon Demo Console** at the bottom of the chat, type a reply as the Human Specialist, and click **"Reply & Resolve"**.

---

## 🚢 Production Deployment

### Option A: Google Cloud Run (Recommended for Gemini workloads)
1. Build the Docker image:
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/tdretail
   ```
2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy tdretail \
     --image gcr.io/PROJECT_ID/tdretail \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars GEMINI_API_KEY="YOUR_KEY",SENDGRID_API_KEY="YOUR_KEY",FIREBASE_PROJECT_ID="PROJECT_ID"
   ```

### Option B: Firebase App Hosting
1. Connect repository in Firebase Console under **App Hosting**.
2. Configure environment secrets via Secret Manager (`GEMINI_API_KEY`, `SENDGRID_API_KEY`).
3. Deploy automatically via GitHub push trigger.

---

## 📡 API Reference Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/session` | Get active customer persona & available demo personas |
| `POST` | `/api/session` | Switch customer persona session |
| `GET` | `/api/merchants` | List participating merchants and branding |
| `GET` | `/api/merchants/[id]` | Get merchant support policy and config |
| `GET` | `/api/orders` | Query customer orders scoped by merchant |
| `POST` | `/api/orders` | Create simulated purchase from storefront |
| `GET` | `/api/conversations` | Get consolidated customer inbox threads |
| `POST` | `/api/conversations` | Open new support inquiry with merchant & order grounding |
| `GET` | `/api/conversations/[id]` | Get conversation details, linked order, and messages |
| `POST` | `/api/conversations/[id]/messages` | Post message, execute Gemini tool calls, send email |
| `POST` | `/api/conversations/[id]/escalate` | Escalate thread to human specialist |
| `POST` | `/api/conversations/[id]/agent-reply` | Reply and resolve as human support specialist |
| `POST` | `/api/webhooks/sendgrid` | SendGrid Inbound Parse Webhook endpoint |
| `POST` | `/api/webhooks/sendgrid/simulate` | Helper to simulate incoming customer email reply |
| `GET` | `/api/outbox` | View outgoing support emails for development |
| `POST` | `/api/seed` | Reset and reseed Firestore with initial demo data |

---

## 📄 License
MIT License. Built for the TD Retail Multi-Merchant AI Customer Support Hackathon.
