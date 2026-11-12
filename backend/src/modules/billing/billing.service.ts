import { randomUUID } from 'node:crypto';
import type { Collection } from 'mongodb';
import { getDatabase } from '@services/mongo.service';
import { DangerError } from '@errors/DangerError';
import type { User } from '@models/User';
import { db } from '@utils/db.util';
import { mercadoPagoGateway, type MercadoPagoOrder } from './mercadoPago.gateway';

type PaidPlan = 'basic' | 'gold';
interface BillingOrderDocument {
  _id: string;
  userId: string;
  plan: PaidPlan;
  amount: string;
  mercadoPagoOrderId?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
}

const PRICES: Record<PaidPlan, string> = { basic: '2.00', gold: '10.00' };
let orders: Collection<BillingOrderDocument> | null = null;
const memoryOrders = new Map<string, BillingOrderDocument>();

function isPaidPlan(value: unknown): value is PaidPlan {
  return value === 'basic' || value === 'gold';
}

function frontendReturnUrl(orderId: string, result: 'success' | 'pending' | 'failure'): string | undefined {
  const origin = process.env.FRONTEND_URL?.trim();
  if (!origin) return undefined;
  try {
    const returnPath = result === 'success' ? '/app' : '/app/planos';
    const url = new URL(returnPath, origin);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') return undefined;
    url.searchParams.set('billing', result);
    url.searchParams.set('order_id', orderId);
    return url.toString();
  } catch {
    return undefined;
  }
}

class BillingService {
  async init(): Promise<void> {
    const mongo = getDatabase();
    if (!mongo) return;
    orders = mongo.collection<BillingOrderDocument>('billing_orders');
    await orders.createIndex({ mercadoPagoOrderId: 1 }, { unique: true, sparse: true });
    await orders.createIndex({ userId: 1, createdAt: -1 });
  }

  async createCheckout(user: User, requestedPlan: unknown): Promise<{ checkoutUrl: string; orderId: string }> {
    if (!isPaidPlan(requestedPlan)) throw new DangerError('Plano solicitado inválido.', 400);
    if (user.role === 'owner') throw new DangerError('A conta proprietária não precisa contratar um plano.', 400);
    const orderId = `orb_${randomUUID()}`;
    const now = new Date();
    const record: BillingOrderDocument = {
      _id: orderId,
      userId: user.id,
      plan: requestedPlan,
      amount: PRICES[requestedPlan],
      status: 'creating',
      createdAt: now,
      updatedAt: now
    };

    if (orders) await orders.insertOne(record);
    else memoryOrders.set(orderId, record);

    try {
      const success = frontendReturnUrl(orderId, 'success');
      const pending = frontendReturnUrl(orderId, 'pending');
      const failure = frontendReturnUrl(orderId, 'failure');
      const created = await mercadoPagoGateway.createOrder({
        orderId,
        plan: requestedPlan,
        amount: record.amount,
        email: user.email,
        ...(success && pending && failure ? { backUrls: { success, pending, failure } } : {})
      });
      record.mercadoPagoOrderId = created.id;
      record.status = 'created';
      record.updatedAt = new Date();
      if (orders) await orders.updateOne({ _id: orderId }, { $set: { mercadoPagoOrderId: created.id, status: record.status, updatedAt: record.updatedAt } });
      return { checkoutUrl: created.checkoutUrl, orderId };
    } catch (error) {
      record.status = 'creation_failed';
      record.updatedAt = new Date();
      if (orders) await orders.updateOne({ _id: orderId }, { $set: { status: record.status, updatedAt: record.updatedAt } }).catch(() => undefined);
      throw error;
    }
  }

  async processWebhook(orderId: string): Promise<void> {
    const mpOrder = await mercadoPagoGateway.getOrder(orderId);
    if (!mpOrder.external_reference) throw new DangerError('Referência do pedido ausente.', 400);
    const record = orders
      ? await orders.findOne({ _id: mpOrder.external_reference })
      : memoryOrders.get(mpOrder.external_reference) ?? null;
    if (!record || record.mercadoPagoOrderId !== mpOrder.id) {
      throw new DangerError('Pedido de cobrança não encontrado.', 404);
    }

    const amountMatches = Number(mpOrder.total_amount).toFixed(2) === Number(record.amount).toFixed(2);
    const paidAmount = Number(mpOrder.total_paid_amount ?? 0);
    if (mpOrder.currency !== 'BRL' || !amountMatches) {
      throw new DangerError('Os dados do pedido não correspondem à cobrança registrada.', 400);
    }

    record.status = mpOrder.status;
    record.updatedAt = new Date();
    if (orders) await orders.updateOne({ _id: record._id }, { $set: { status: record.status, updatedAt: record.updatedAt } });

    if (mpOrder.status !== 'processed' || paidAmount < Number(record.amount)) return;
    await db.activatePaidPlanFromOrder(record.userId, record.plan, record._id);
    record.activatedAt = new Date();
    if (orders) await orders.updateOne({ _id: record._id }, { $set: { activatedAt: record.activatedAt } });
  }
}

export const billingService = new BillingService();
