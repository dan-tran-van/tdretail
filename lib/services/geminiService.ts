import { GoogleGenAI } from '@google/genai';
import { TDStore } from '@/lib/firebase/store';
import { OrderService } from '@/lib/services/orderService';
import {
  Conversation,
  Customer,
  Message,
  ToolCallExecution,
} from '@/lib/types';

export interface ProcessMessageParams {
  conversation: Conversation;
  customerMessage: string;
  customer: Customer;
}

export class GeminiAgentService {
  private static getGeminiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
      return null;
    }
    return new GoogleGenAI({ apiKey });
  }

  /**
   * Main entry point to process an incoming customer message.
   * Leverages Gemini 2.5 Flash with server-side tools or intelligent fallback.
   */
  static async processMessage(params: ProcessMessageParams): Promise<Message> {
    const { conversation, customerMessage, customer } = params;

    const merchant = await TDStore.getMerchantById(conversation.merchantId);
    const merchantName = merchant ? merchant.name : 'TD Retail Merchant';
    const client = this.getGeminiClient();

    // Fetch conversation history for full context
    const history = await TDStore.getMessages(conversation.id);

    // If Gemini API Key is available, use real Gemini SDK with function calling
    if (client) {
      try {
        return await this.executeGeminiWithTools({
          client,
          conversation,
          merchant,
          customer,
          customerMessage,
          history,
        });
      } catch (error) {
        console.error('[GeminiAgent] Error invoking Gemini API, falling back to server-side grounded engine:', error);
      }
    }

    // Grounded Fallback Engine (no external API key needed)
    return await this.executeGroundedFallbackEngine({
      conversation,
      merchant,
      customer,
      customerMessage,
      history,
    });
  }

  /**
   * Real Google Gemini SDK Tool-Calling Loop
   */
  private static async executeGeminiWithTools(context: {
    client: GoogleGenAI;
    conversation: Conversation;
    merchant: any;
    customer: Customer;
    customerMessage: string;
    history: Message[];
  }): Promise<Message> {
    const { client, conversation, merchant, customer, customerMessage, history } = context;

    const systemPrompt = `You are the official AI Support Specialist for "${merchant.name}" on the TD Retail Shared Customer Support Platform.
Merchant Category: ${merchant.category}
Support Policy:
- Returns: ${merchant.supportPolicy.returns}
- Refunds: ${merchant.supportPolicy.refunds}
- Delivery/Fulfillment: ${merchant.supportPolicy.deliveryOrDownload}
- Escalation Threshold: ${merchant.supportPolicy.escalationThreshold}

Customer Profile:
- Name: ${customer.name}
- Email: ${customer.email}
- Current Merchant ID: ${conversation.merchantId}
- Current Thread Order Reference: ${conversation.orderId || 'None specified'}

CRITICAL RULES:
1. GROUNDED FACTUALITY: NEVER hallucinate, guess, or invent order statuses, tracking numbers, download keys, or courier positions.
2. TOOL USAGE: If the customer mentions or asks about an order (e.g., status, tracking, download link, arrival time), you MUST call the "lookupOrderStatus" tool.
3. AUTHORIZATION: You are strictly scoped to "${merchant.name}". The server will reject orders belonging to other merchants.
4. HUMAN ESCALATION: If the customer asks to speak with a human, or if their issue exceeds the automated refund policy, you MUST call "requestHumanEscalation".
5. Be warm, professional, concise, and helpful.`;

    const toolDeclarations = [
      {
        name: 'lookupOrderStatus',
        description: 'Looks up official verified order information including status, items, delivery ETA, download links, and courier notes for the current customer.',
        parameters: {
          type: 'OBJECT',
          properties: {
            orderId: {
              type: 'STRING',
              description: 'The order identifier, e.g. ORD-MUS-8821 or ORD-GROC-5512',
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'requestHumanEscalation',
        description: 'Escalates this conversation to a human support agent when the issue cannot be automated or when the user requests a human.',
        parameters: {
          type: 'OBJECT',
          properties: {
            reason: {
              type: 'STRING',
              description: 'Specific reason for the escalation',
            },
          },
          required: ['reason'],
        },
      },
    ];

    // Format chat contents
    const contents: any[] = [];
    // Include last 6 messages
    for (const msg of history.slice(-6)) {
      contents.push({
        role: msg.sender === 'customer' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: customerMessage }],
    });

    const toolCallsRecord: ToolCallExecution[] = [];
    let groundedOrderId: string | undefined;
    let groundedOrderStatus: string | undefined;
    let escalationTriggered = false;

    // First call to Gemini
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: toolDeclarations as any }],
      },
    });

    const candidates = response.candidates || [];
    const firstCandidate = candidates[0];
    const functionCalls = firstCandidate?.content?.parts?.filter((p: any) => p.functionCall)?.map((p: any) => p.functionCall) || [];

    let finalContent = '';

    if (functionCalls.length > 0) {
      // Execute each tool call server-side
      const functionResponseParts: any[] = [];

      for (const fc of functionCalls) {
        if (fc.name === 'lookupOrderStatus') {
          const rawOrderId = (fc.args?.orderId as string) || conversation.orderId || '';
          const result = await OrderService.lookupOrderStatus({
            orderId: rawOrderId,
            merchantId: conversation.merchantId,
            customerId: customer.id,
            customerEmail: customer.email,
          });

          toolCallsRecord.push({
            name: 'lookupOrderStatus',
            arguments: fc.args,
            result: result as unknown as Record<string, unknown>,
            executedAt: new Date().toISOString(),
          });

          if (result.success && result.order) {
            groundedOrderId = result.order.orderId;
            groundedOrderStatus = result.order.orderStatus;
          }

          functionResponseParts.push({
            functionResponse: {
              name: 'lookupOrderStatus',
              response: result,
            },
          });
        } else if (fc.name === 'requestHumanEscalation') {
          const reason = (fc.args?.reason as string) || 'Customer requested human assistance';
          await TDStore.updateConversation(conversation.id, {
            status: 'escalated',
            escalationReason: reason,
          });
          escalationTriggered = true;

          toolCallsRecord.push({
            name: 'requestHumanEscalation',
            arguments: fc.args,
            result: { status: 'escalated', reason },
            executedAt: new Date().toISOString(),
          });

          functionResponseParts.push({
            functionResponse: {
              name: 'requestHumanEscalation',
              response: { status: 'success', message: 'Escalation recorded in system.' },
            },
          });
        }
      }

      // Feed function responses back into Gemini for final answer
      const followupContents = [
        ...contents,
        firstCandidate.content,
        {
          role: 'user',
          parts: functionResponseParts,
        },
      ];

      const followupResponse = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: followupContents,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      finalContent = followupResponse.text || 'I have looked up your details with our system.';
    } else {
      finalContent = response.text || "Thank you for reaching out. How can I assist you with your order today?";
    }

    const aiMessage: Message = {
      id: `msg_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationId: conversation.id,
      sender: 'ai',
      senderName: `${merchant.name} Gemini AI`,
      content: finalContent,
      metadata: {
        isAiGrounded: toolCallsRecord.length > 0,
        modelName: 'gemini-2.5-flash',
        toolCalls: toolCallsRecord,
        groundedOrderId,
        groundedOrderStatus,
        escalationTriggered,
      },
      timestamp: new Date().toISOString(),
    };

    await TDStore.addMessage(aiMessage);
    return aiMessage;
  }

  /**
   * Deterministic Grounded Support Engine (Fallback if GEMINI_API_KEY is not set)
   * Follows the exact same tool authorization and grounding schema.
   */
  private static async executeGroundedFallbackEngine(context: {
    conversation: Conversation;
    merchant: any;
    customer: Customer;
    customerMessage: string;
    history: Message[];
  }): Promise<Message> {
    const { conversation, merchant, customer, customerMessage } = context;
    const lowerMsg = customerMessage.toLowerCase();

    // Check for explicit escalation request
    const wantsHuman =
      lowerMsg.includes('human') ||
      lowerMsg.includes('agent') ||
      lowerMsg.includes('representative') ||
      lowerMsg.includes('speak to someone') ||
      lowerMsg.includes('escalate') ||
      lowerMsg.includes('supervisor');

    if (wantsHuman) {
      const reason = 'Customer explicitly requested live human support';
      await TDStore.updateConversation(conversation.id, {
        status: 'escalated',
        escalationReason: reason,
      });

      const escalationToolCall: ToolCallExecution = {
        name: 'requestHumanEscalation',
        arguments: { reason },
        result: { status: 'escalated', ticketId: conversation.id, priority: 'high' },
        executedAt: new Date().toISOString(),
      };

      const aiMsg: Message = {
        id: `msg_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        conversationId: conversation.id,
        sender: 'ai',
        senderName: `${merchant.name} Gemini Assistant`,
        content: `I have transferred this conversation to a senior **${merchant.name} Support Specialist**. A team member has been notified and will review your thread shortly. You will also receive their reply directly via your registered email (${customer.email}).`,
        metadata: {
          isAiGrounded: true,
          modelName: 'gemini-2.5-flash (server-grounded fallback)',
          escalationTriggered: true,
          toolCalls: [escalationToolCall],
        },
        timestamp: new Date().toISOString(),
      };

      await TDStore.addMessage(aiMsg);
      return aiMsg;
    }

    // Extract Order ID if present in message or use conversation.orderId
    const orderMatch = customerMessage.match(/ORD-[A-Z]+-\d+/i);
    const orderIdToLookup = orderMatch ? orderMatch[0].toUpperCase() : conversation.orderId;

    if (orderIdToLookup) {
      // Execute server-side tool with strict multi-merchant boundary verification
      const lookupResult = await OrderService.lookupOrderStatus({
        orderId: orderIdToLookup,
        merchantId: conversation.merchantId,
        customerId: customer.id,
        customerEmail: customer.email,
      });

      const toolCall: ToolCallExecution = {
        name: 'lookupOrderStatus',
        arguments: { orderId: orderIdToLookup },
        result: lookupResult as unknown as Record<string, unknown>,
        executedAt: new Date().toISOString(),
      };

      if (!lookupResult.success || !lookupResult.order) {
        // Safe rejection response
        const errorContent = `I checked our order database for **${orderIdToLookup}**: ${lookupResult.error}`;
        const aiMsg: Message = {
          id: `msg_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          conversationId: conversation.id,
          sender: 'ai',
          senderName: `${merchant.name} Gemini Assistant`,
          content: errorContent,
          metadata: {
            isAiGrounded: true,
            modelName: 'gemini-2.5-flash (server-grounded fallback)',
            toolCalls: [toolCall],
          },
          timestamp: new Date().toISOString(),
        };
        await TDStore.addMessage(aiMsg);
        return aiMsg;
      }

      // Grounded success response tailored to domain
      const o = lookupResult.order;
      let replyContent = '';

      if (merchant.category === 'digital_music') {
        replyContent = `Hello ${customer.name}, I pulled up your verified order details for **${o.orderId}**:\n\n` +
          `• **Status:** ${o.orderStatusDisplay}\n` +
          `• **Items:** ${o.items.map((i) => `${i.title} (${i.quantity}x)`).join(', ')}\n` +
          (o.items[0]?.licenseKey ? `• **License Key:** \`${o.items[0].licenseKey}\`\n` : '') +
          (o.items[0]?.downloadUrl ? `• **Vault Download Link:** [Direct Download](${o.items[0].downloadUrl})\n` : '') +
          `• **Fulfillment Details:** ${o.courierNotes || 'Bit-perfect lossless files ready in your vault.'}\n\n` +
          `According to SoundWave policy, your license and master audio stems can be re-downloaded at any time from your account. Let me know if you need assistance configuring high-res audio playback!`;
      } else if (merchant.category === 'groceries') {
        replyContent = `Hello ${customer.name}, here is the live fulfillment status for **${o.orderId}**:\n\n` +
          `• **Status:** ${o.orderStatusDisplay}\n` +
          `• **Items:** ${o.items.map((i) => `${i.title} (${i.quantity}x)`).join(', ')}\n` +
          `• **Delivery Courier:** ${o.carrierOrCourier || 'FreshCart Express Team'}\n` +
          `• **Estimated Arrival:** ${o.estimatedDelivery || 'Within current delivery window'}\n` +
          `• **Destination:** ${o.deliveryAddress || customer.defaultAddress || 'On file'}\n` +
          `• **Dispatch Notes:** ${o.courierNotes || 'Thermal insulated packing with ice packs active.'}\n\n` +
          `All perishable items are protected by our 100% Farm-Fresh Guarantee. If you need special gate instructions given to the driver, just reply here!`;
      } else {
        replyContent = `Order **${o.orderId}** is currently **${o.orderStatusDisplay}**. Total: $${o.totalAmount.toFixed(2)} ${o.currency}.`;
      }

      const aiMsg: Message = {
        id: `msg_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        conversationId: conversation.id,
        sender: 'ai',
        senderName: `${merchant.name} Gemini Assistant`,
        content: replyContent,
        metadata: {
          isAiGrounded: true,
          modelName: 'gemini-2.5-flash (server-grounded fallback)',
          groundedOrderId: o.orderId,
          groundedOrderStatus: o.orderStatus,
          toolCalls: [toolCall],
        },
        timestamp: new Date().toISOString(),
      };

      await TDStore.addMessage(aiMsg);
      return aiMsg;
    }

    // General merchant assistance (policy, greetings, inquiries)
    let generalReply = `Hello ${customer.name}! I am your AI assistant for **${merchant.name}**.\n\n` +
      `I can check real-time order tracking, retrieve download license keys, or help you with returns and replacements.\n\n` +
      `**Merchant Policy Quick Reference:**\n` +
      `• Returns & Freshness: ${merchant.supportPolicy.returns}\n` +
      `• Refunds: ${merchant.supportPolicy.refunds}\n\n` +
      `To check an order, please provide your Order ID (such as \`#ORD-MUS-8821\` or \`#ORD-GROC-5512\`), or click "Request Human Assistance" if you need immediate human review.`;

    const aiMsg: Message = {
      id: `msg_ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationId: conversation.id,
      sender: 'ai',
      senderName: `${merchant.name} Gemini Assistant`,
      content: generalReply,
      metadata: {
        isAiGrounded: false,
        modelName: 'gemini-2.5-flash (server-grounded fallback)',
      },
      timestamp: new Date().toISOString(),
    };

    await TDStore.addMessage(aiMsg);
    return aiMsg;
  }
}
