import { createHmac, timingSafeEqual } from 'node:crypto';
import { DangerError } from '@errors/DangerError';

const MERCADO_PAGO_API = 'https://api.mercadopago.com';

export interface MercadoPagoOrderInput {
  orderId: string;
  plan: 'basic' | 'gold';
  amount: string;
  email: string;
  backUrls?: {
    success: string;
    pending: string;
    failure: string;
  };
}

export interface MercadoPagoOrderCreated {
  id: string;
  checkoutUrl: string;
}

export interface MercadoPagoOrder {
  id: string;
  status: string;
  status_detail?: string;
  external_reference?: string | null;
  total_amount: string;
  total_paid_amount?: string;
  currency?: string;
}

function readAccessToken(): string {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new DangerError('O pagamento online ainda não está configurado.', 503);
  }
  return accessToken;
}

function apiMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = payload as Record<string, unknown>;
  return typeof value.message === 'string' ? value.message : null;
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = apiMessage(payload);
    throw new DangerError(
      message ? `Mercado Pago: ${message}` : 'Não foi possível iniciar o pagamento no Mercado Pago.',
      response.status >= 500 ? 502 : 400
    );
  }
  return payload as T;
}

function safeCheckoutUrl(value: unknown): string {
  if (typeof value !== 'string') {
    throw new DangerError('O Mercado Pago não retornou o endereço de checkout.', 502);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DangerError('O Mercado Pago retornou um endereço de checkout inválido.', 502);
  }

  const trustedHost =
    url.protocol === 'https:' &&
    (url.hostname === 'mercadopago.com.br' ||
      url.hostname.endsWith('.mercadopago.com.br') ||
      url.hostname === 'mercadopago.com' ||
      url.hostname.endsWith('.mercadopago.com'));

  if (!trustedHost) {
    throw new DangerError('O Mercado Pago retornou um endereço de checkout não confiável.', 502);
  }

  return url.toString();
}

function parseSignature(signature: string): Map<string, string> {
  return new Map(
    signature.split(',').flatMap((part) => {
      const separator = part.indexOf('=');
      if (separator < 1) return [];
      return [[part.slice(0, separator).trim(), part.slice(separator + 1).trim()]];
    })
  );
}

export class MercadoPagoGateway {
  public async createOrder(input: MercadoPagoOrderInput): Promise<MercadoPagoOrderCreated> {
    const body = {
      type: 'online',
      processing_mode: 'manual',
      capture_mode: 'automatic_async',
      total_amount: input.amount,
      external_reference: input.orderId,
      description: `Orbit API ${input.plan === 'basic' ? 'Basic' : 'Gold'} — plano mensal`,
      payer: { email: input.email },
      items: [
        {
          title: `Orbit API ${input.plan === 'basic' ? 'Basic' : 'Gold'} — plano mensal`,
          quantity: 1,
          unit_price: input.amount
        }
      ],
      ...(input.backUrls
        ? {
            config: {
              online: {
                success_url: input.backUrls.success,
                pending_url: input.backUrls.pending,
                failure_url: input.backUrls.failure,
                auto_return: 'approved'
              }
            }
          }
        : {})
    };

    const response = await fetch(`${MERCADO_PAGO_API}/v1/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${readAccessToken()}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': input.orderId
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000)
    });

    const order = await readApiResponse<{
      id: string;
      checkout_url?: string;
    }>(response);

    return {
      id: order.id,
      checkoutUrl: safeCheckoutUrl(order.checkout_url)
    };
  }

  public async getOrder(orderId: string): Promise<MercadoPagoOrder> {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(orderId)) {
      throw new DangerError('Identificador do pedido inválido.', 400);
    }

    const response = await fetch(`${MERCADO_PAGO_API}/v1/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${readAccessToken()}` },
      signal: AbortSignal.timeout(10_000)
    });

    return readApiResponse<MercadoPagoOrder>(response);
  }

  public verifyWebhookSignature(input: {
    signature: string | null;
    requestId: string | null;
    dataId: string | null;
  }): boolean {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
    if (!secret || !input.signature || !input.requestId || !input.dataId) return false;

    const parts = parseSignature(input.signature);
    const timestamp = parts.get('ts');
    const receivedHash = parts.get('v1');
    if (!timestamp || !receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) return false;

    const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${timestamp};`;
    const expectedHash = createHmac('sha256', secret).update(manifest).digest();
    const providedHash = Buffer.from(receivedHash, 'hex');
    return providedHash.length === expectedHash.length && timingSafeEqual(providedHash, expectedHash);
  }
}

export const mercadoPagoGateway = new MercadoPagoGateway();
