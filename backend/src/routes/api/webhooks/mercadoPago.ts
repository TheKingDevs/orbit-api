import { mercadoPagoGateway } from '@modules/billing/mercadoPago.gateway';
import { billingService } from '@modules/billing/billing.service';

export async function mercadoPagoWebhookRoute(req: Request, url: URL): Promise<Response> {
  const dataId = url.searchParams.get('data.id') ?? url.searchParams.get('id');
  const validSignature = mercadoPagoGateway.verifyWebhookSignature({
    signature: req.headers.get('x-signature'),
    requestId: req.headers.get('x-request-id'),
    dataId
  });
  if (!validSignature) return Response.json({ success: false }, { status: 401 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const type = body.type ?? body.topic;
  const resourceId = dataId ?? (typeof body.data === 'object' && body.data && 'id' in body.data
    ? String((body.data as { id: unknown }).id)
    : null);
  if (type === 'order' && resourceId) await billingService.processWebhook(resourceId);
  return Response.json({ success: true });
}
