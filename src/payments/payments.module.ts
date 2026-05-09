import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { ConfigModule } from '@nestjs/config';
import { PaymentsGateway } from './gateway/payments.gateway';

import { User } from 'src/auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, User]), ConfigModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsGateway],
  exports: [PaymentsService, PaymentsGateway],
})
export class PaymentsModule {}
