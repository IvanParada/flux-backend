import { Controller, Post, Body } from '@nestjs/common';
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
}
