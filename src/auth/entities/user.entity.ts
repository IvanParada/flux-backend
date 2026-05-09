import { Transaction } from 'src/payments/entities/transaction.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  rut: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ type: 'text', nullable: true, select: false })
  verificationCode: string | null;

  @Column({ type: 'text', nullable: true })
  passwordResetCode: string | null;

  @Column({ name: 'bank_holder_id', nullable: true })
  bank_holder_id: string;

  @Column({ name: 'bank_number', nullable: true })
  bank_number: string;

  @Column({ name: 'bank_type', nullable: true })
  bank_type: string;

  @Column({ name: 'bank_institution_id', nullable: true })
  bank_institution_id: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];
}
