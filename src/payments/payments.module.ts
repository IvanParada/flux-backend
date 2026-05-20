import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { ConfigModule } from '@nestjs/config';
import { PaymentsGateway } from './gateway/payments.gateway';

import { User } from 'src/auth/entities/user.entity';
import { AuthModule } from 'src/auth/auth.module';
import { Payment } from './entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Payment, User]),
    ConfigModule,
    AuthModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsGateway],
  exports: [PaymentsService, PaymentsGateway],
})
export class PaymentsModule {}
