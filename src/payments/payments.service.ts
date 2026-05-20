import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Fintoc, WebhookSignature } from 'fintoc';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionStatus } from './enums/transaction-status.enum';
import { Transaction } from './entities/transaction.entity';
import { User } from 'src/auth/entities/user.entity';
import { PaymentsGateway } from './gateway/payments.gateway';
import { UpdateBankDataDto } from './dto/update-bank-data.dto';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';

@Injectable()
export class PaymentsService {
  private client: Fintoc;
  private readonly logger = new Logger(PaymentsService.name);
  private readonly webhookSecret: string;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly paymentsGateway: PaymentsGateway,
  ) {
    const apiKey = this.configService.get<string>('FINTOC_API_KEY') ?? '';
    this.client = new Fintoc(apiKey);

    this.webhookSecret =
      this.configService.get<string>('FINTOC_WEBHOOK_SECRET') ?? '';

    const secret = this.webhookSecret.trim();

    this.logger.log(
      `FINTOC_WEBHOOK_SECRET: ${secret
        ? `${secret.slice(0, 6)}...${secret.slice(-6)} length=${secret.length}`
        : 'NO CONFIGURADO'
      }`,
    );
  }

  async updateUserBankData(userId: string, data: UpdateBankDataDto) {
    await this.userRepository.update(userId, {
      bank_holder_id: data.bank_holder_id,
      bank_number: data.bank_number,
      bank_type: data.bank_type,
      bank_institution_id: data.bank_institution_id,
    });

    return { message: 'BANK_DATA_UPDATED_SUCCESSFULLY' };
  }

  async createPaymentLink(userId: string, amount: number, description: string) {
    const externalReference = uuidv4();

    const baseUrl = this.configService.get<string>('BASE_URL');
    if (!baseUrl) throw new Error('BASE_URL no está configurado');

    const seller = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!seller) {
      throw new NotFoundException('Vendedor no encontrado');
    }

    const transaction = this.transactionRepository.create({
      amount: Math.round(amount),
      description,
      externalReference,
      status: TransactionStatus.PENDING,
      user: { id: userId } as any,
    });

    await this.transactionRepository.save(transaction);

    const session = await this.client.checkoutSessions.create({
      amount: Math.round(amount),
      currency: 'CLP',
      name: description,
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/payment-failed`,
      metadata: {
        external_reference: externalReference,
        seller_id: userId,
      },
    });

    const paymentUrl = (session as any).redirect_url;

    if (!paymentUrl) {
      throw new Error('Fintoc no devolvió URL de pago');
    }

    transaction.paymentUrl = paymentUrl;
    await this.transactionRepository.save(transaction);

    return {
      url: paymentUrl,
      reference: externalReference,
    };
  }

  async processWebhook(fintocSignature: string, rawBody: string, body: any) {
    try {
      this.logger.log(`[Webhook Fintoc] Evento: ${body?.type}`);

      try {
        WebhookSignature.verifyHeader(
          rawBody,
          fintocSignature,
          this.webhookSecret.trim(),
        );
      } catch (err) {
        this.logger.error('Firma Fintoc inválida', err);
        return {
          received: true,
          ignored: true,
          reason: 'invalid_signature',
        };
      }

      this.logger.log(`Firma validada. Evento: ${body.type}`);

      const externalReference = this.extractExternalReference(body);

      switch (body.type) {
        case 'payment_intent.succeeded':
          return await this.handlePaymentSucceeded(body, externalReference);

        case 'payment_intent.failed':
          return await this.handlePaymentFailed(body, externalReference);

        case 'checkout_session.finished':
          this.logger.log(
            `Checkout session finalizada: ${body.data?.id}. Esperando/ignorando confirmación final.`,
          );

          return {
            received: true,
            ignored: true,
            reason: 'checkout_session_finished_not_final_confirmation',
          };

        default:
          return {
            received: true,
            ignored: true,
            reason: 'unhandled_event_type',
            eventType: body.type,
          };
      }
    } catch (error) {
      this.logger.error(
        `Error procesando webhook de Fintoc: ${error.message}`,
        error.stack,
      );

      return {
        received: true,
        ignored: true,
        reason: 'webhook_processing_error',
      };
    }
  }

  private extractExternalReference(body: any): string | null {
    return (
      body.data?.metadata?.external_reference ||
      body.data?.payment_resource?.payment_intent?.metadata?.external_reference ||
      body.data?.payment_intent?.metadata?.external_reference ||
      null
    );
  }

  private async handlePaymentSucceeded(body: any, externalReference: string | null) {
    const paymentIntentId = body.data?.id;

    this.logger.log(`[SUCCESS] paymentIntentId=${paymentIntentId}`);
    this.logger.log(`[SUCCESS] externalReference=${externalReference}`);

    if (!paymentIntentId || !externalReference) {
      this.logger.error('[SUCCESS] Faltan datos requeridos');

      return {
        received: true,
        ignored: true,
        reason: 'missing_required_data',
      };
    }

    const transaction = await this.transactionRepository.findOne({
      where: { externalReference },
      relations: ['user'],
    });

    this.logger.log(`[SUCCESS] transaction encontrada=${!!transaction}`);
    this.logger.log(`[SUCCESS] transaction id=${transaction?.id}`);
    this.logger.log(`[SUCCESS] user cargado=${!!transaction?.user}`);

    if (!transaction) {
      return {
        received: true,
        ignored: true,
        reason: 'transaction_not_found',
      };
    }

    const existingPayment = await this.paymentRepository.findOne({
      where: { fintocPaymentIntentId: paymentIntentId },
    });

    if (existingPayment) {
      this.logger.log(`[SUCCESS] payment duplicado id=${existingPayment.id}`);

      return {
        received: true,
        duplicated: true,
        paymentId: existingPayment.id,
      };
    }

    const paidAt = body.data?.transaction_date
      ? new Date(body.data.transaction_date)
      : new Date();

    transaction.status = TransactionStatus.APPROVED;
    transaction.fintocPaymentIntentId = paymentIntentId;
    transaction.paidAt = paidAt;

    await this.transactionRepository.save(transaction);

    this.logger.log('[SUCCESS] creando payment...');

    const payment = this.paymentRepository.create({
      externalReference,
      fintocPaymentIntentId: paymentIntentId,
      amount: body.data?.amount ?? transaction.amount,
      currency: body.data?.currency ?? 'CLP',
      description: transaction.description ?? null,
      status: PaymentStatus.SUCCESS,
      paidAt,
      user: transaction.user,
      transaction,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    this.logger.log(`[SUCCESS] payment creado id=${savedPayment.id}`);

    this.paymentsGateway.notifyPaymentUpdate(
      externalReference,
      TransactionStatus.APPROVED,
    );

    this.logger.log(`Pago aprobado: ${externalReference}`);

    return {
      received: true,
      created: true,
      paymentId: savedPayment.id,
      amount: savedPayment.amount,
    };
  }

  private async handlePaymentFailed(body: any, externalReference: string | null) {
    if (!externalReference) {
      this.logger.error('No se encontró external_reference en payment_intent.failed');

      return {
        received: true,
        ignored: true,
        reason: 'missing_external_reference',
      };
    }

    const transaction = await this.transactionRepository.findOne({
      where: { externalReference },
    });

    if (!transaction) {
      this.logger.error(`Transacción ${externalReference} no encontrada.`);

      return {
        received: true,
        ignored: true,
        reason: 'transaction_not_found',
      };
    }

    if (transaction.status === TransactionStatus.APPROVED) {
      this.logger.warn(
        `Llegó payment_intent.failed para una transacción ya aprobada: ${externalReference}`,
      );

      return {
        received: true,
        ignored: true,
        reason: 'already_approved',
        status: transaction.status,
        externalReference,
      };
    }

    transaction.status = TransactionStatus.REJECTED;

    const updatedTx = await this.transactionRepository.save(transaction);

    this.paymentsGateway.notifyPaymentUpdate(
      updatedTx.externalReference,
      updatedTx.status,
    );

    this.logger.warn(`Pago rechazado: ${externalReference}`);

    return {
      received: true,
      updated: true,
      status: updatedTx.status,
      externalReference: updatedTx.externalReference,
    };
  }

}
