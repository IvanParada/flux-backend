import {
  Controller,
  Post,
  Body,
  HttpCode,
  Headers,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-payment')
  async createPaymentLink(@Body() createPaymentDto: CreatePaymentDto) {
    return await this.paymentsService.createPaymentLink(
      createPaymentDto.userId,
      createPaymentDto.amount,
      createPaymentDto.description,
    );
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Headers('fintoc-signature') fintocSignature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody?.toString();
    const body = req.body;

    if (!fintocSignature || !rawBody) {
      return {
        received: true,
        ignored: true,
        reason: 'missing_data',
      };
    }

    return this.paymentsService.processWebhook(fintocSignature, rawBody, body);
  }
}
