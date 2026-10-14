import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/emailService';

export async function POST(req: NextRequest) {
  try {
    let from = '';
    let to = '';
    let subject = '';
    let text = '';
    let html = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      from = (formData.get('from') as string) || '';
      to = (formData.get('to') as string) || '';
      subject = (formData.get('subject') as string) || '';
      text = (formData.get('text') as string) || '';
      html = (formData.get('html') as string) || '';
    } else {
      const json = await req.json().catch(() => ({}));
      from = json.from || '';
      to = json.to || '';
      subject = json.subject || '';
      text = json.text || json.body || '';
      html = json.html || '';
    }

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required email fields (from, to).' },
        { status: 400 }
      );
    }

    console.log(`[SendGrid Webhook] Received inbound email from: ${from}, to: ${to}, subject: ${subject}`);

    const result = await EmailService.handleInboundEmail({
      from,
      to,
      subject,
      text: text || 'Customer replied without body text.',
      html,
    });

    if (!result.success) {
      console.warn('[SendGrid Webhook] Handling failed:', result.error);
      return NextResponse.json({ success: false, error: result.error }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      message: 'Email ingested and processed by TD Retail Gemini Agent.',
      messageId: result.messageId,
      aiReply: result.aiReply,
    });
  } catch (error) {
    console.error('[SendGrid Webhook] Unhandled error during inbound email parsing:', error);
    return NextResponse.json({ error: 'Internal error processing webhook' }, { status: 500 });
  }
}
