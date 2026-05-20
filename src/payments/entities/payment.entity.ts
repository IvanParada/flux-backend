import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { Transaction } from './transaction.entity';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'external_reference' })
  externalReference: string;

  @Index()
  @Column({ name: 'fintoc_payment_intent_id', unique: true })
  fintocPaymentIntentId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'CLP' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.SUCCESS,
  })
  status: PaymentStatus;

  @Column({ name: 'paid_at', type: 'timestamp' })
  paidAt: Date;

  @ManyToOne(() => User, (user) => user.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToOne(() => Transaction, (transaction) => transaction.payment, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}