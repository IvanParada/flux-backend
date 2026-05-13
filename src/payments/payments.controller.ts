import {
  Controller,
  Post,
  Body,
  HttpCode,
  Headers,
  Req,
  RawBodyRequest,
  Get,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ACCOUNT_TYPES, CHILEAN_BANKS } from './constants/bank-info.constants';
import { UpdateBankDataDto } from './dto/update-bank-data.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

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

  @Get('bank-constants')
  getBankConstants() {
    return {
      banks: CHILEAN_BANKS,
      accountTypes: ACCOUNT_TYPES,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('set-bank-data')
  async updateBankData(@Req() req, @Body() dto: UpdateBankDataDto) {
    return await this.paymentsService.updateUserBankData(req.user.userId, dto);
  }
}
