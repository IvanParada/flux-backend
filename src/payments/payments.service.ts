import { Injectable } from '@nestjs/common';
import MercadoPagoConfig, { Preference } from 'mercadopago';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PaymentsService {
  private client: MercadoPagoConfig;
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly configService: ConfigService,
  ) {
    this.client = new MercadoPagoConfig({
      accessToken: this.configService.get<string>('MP_ACCESS_TOKEN') ?? '',
    });
  }

  async createPaymentLink(userId: string, amount: number, description: string) {
    try {
      console.log('Entre al servicio');
      const externalReference = uuidv4();
      const preference = new Preference(this.client);
      const response = await preference.create({
        body: {
          external_reference: externalReference,
          items: [
            {
              id: externalReference,
              title: description,
              quantity: 1,
              unit_price: Number(amount),
              currency_id: 'CLP',
            },
          ],
          back_urls: {
            success: `${this.configService.get<string>('BASE_URL')}/success`,
            failure: `${this.configService.get<string>('BASE_URL')}/payment-failed`,
            pending: `${this.configService.get<string>('BASE_URL')}/payment-pending`,
          },
          notification_url: `${this.configService.get<string>('BASE_URL')}/payment-webhook`,
          auto_return: 'approved',
        },
      });
      const newTx = this.transactionRepository.create({
        amount,
        description,
        externalReference,
        paymentUrl: response.init_point,
        status: TransactionStatus.PENDING,
        user: { id: userId } as any,
      });

      await this.transactionRepository.save(newTx);
      console.log('SOY LA RESPUESTA1', response.init_point);
      console.log('SOY LA RESPUESTA2', externalReference);
      return {
        url: response.init_point,
        reference: externalReference,
      };
    } catch (error) {
      console.log(error);
    }
  }
}
