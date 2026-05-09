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

@Injectable()
export class PaymentsService {
  private client: Fintoc;
  private readonly logger = new Logger(PaymentsService.name);
  private readonly webhookSecret: string;

  constructor(
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
      `FINTOC_WEBHOOK_SECRET: ${
        secret
          ? `${secret.slice(0, 6)}...${secret.slice(-6)} length=${secret.length}`
          : 'NO CONFIGURADO'
      }`,
    );
  }

  async createPaymentLink(userId: string, amount: number, description: string) {
    try {
      const externalReference = uuidv4();

      const baseUrl = this.configService.get<string>('BASE_URL');

      if (!baseUrl) throw new Error('BASE_URL no está configurado');

      const seller = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!seller) {
        throw new NotFoundException('Vendedor no encontrado');
      }

      if (
        !seller.bank_holder_id ||
        !seller.bank_number ||
        !seller.bank_type ||
        !seller.bank_institution_id
      ) {
        throw new Error(
          'El vendedor no tiene configurados todos sus datos bancarios para recibir pagos',
        );
      }

      const sellerBankData = {
        holder_id: seller.bank_holder_id,
        number: seller.bank_number,
        type: seller.bank_type,
        institution_id: seller.bank_institution_id,
      };

      const session = await this.client.checkoutSessions.create({
        amount: Math.round(amount),
        currency: 'CLP',
        name: description,
        success_url: `${baseUrl}/success`,
        cancel_url: `${baseUrl}/payment-failed`,
        recipient_account: sellerBankData,
        metadata: {
          external_reference: externalReference,
        },
      });

      const paymentUrl = session.payment_url;

      this.logger.log(`Checkout Session creada: ${paymentUrl}`);

      if (!paymentUrl) {
        throw new Error('Fintoc no devolvió URL de pago (Checkout Session)');
      }

      const newTx = this.transactionRepository.create({
        amount,
        description,
        externalReference,
        paymentUrl: paymentUrl,
        status: TransactionStatus.PENDING,
        user: { id: userId } as any,
      });

      await this.transactionRepository.save(newTx);

      return {
        url: paymentUrl,
        reference: externalReference,
      };
    } catch (error) {
      this.logger.error('Error creando link de pago Fintoc', error);
      throw error;
    }
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

      if (
        body.type === 'payment_intent.succeeded' ||
        body.type === 'charge.succeeded' ||
        body.type === 'checkout_session.succeeded'
      ) {
        const externalReference =
          body.data?.metadata?.external_reference ||
          body.data?.payment_intent?.metadata?.external_reference;

        if (!externalReference) {
          this.logger.error(
            'No se encontró external_reference en el webhook data',
          );
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
          this.logger.log(`Pago ya estaba aprobado. Evitando duplicados.`);
          return transaction;
        }

        transaction.status = TransactionStatus.APPROVED;
        const updatedTx = await this.transactionRepository.save(transaction);

        this.paymentsGateway.notifyPaymentUpdate(
          updatedTx.externalReference,
          updatedTx.status,
        );

        return updatedTx;
      }

      return { received: true, ignored: true, reason: 'unhandled_event_type' };
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
}
