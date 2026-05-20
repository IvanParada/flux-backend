import { User } from 'src/auth/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { Payment } from './payment.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Index()
  @Column({ name: 'external_reference', unique: true })
  externalReference: string;

  @Column({ name: 'payment_url', type: 'text', nullable: true })
  paymentUrl: string;

  @Column({ name: 'fintoc_payment_intent_id', nullable: true })
  fintocPaymentIntentId?: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToOne(() => Payment, (payment) => payment.transaction)
  payment: Payment;
}