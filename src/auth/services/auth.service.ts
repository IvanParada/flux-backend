import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { VerifyCodeDto } from '../dto/verify-code.dto';
import { MailService } from './mail.service';
import { LoginDto } from '../dto/login.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { VerifyResetCodeDto } from '../dto/verify-reset-code.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private mailService: MailService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const { email, password, rut } = dto;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      if (!existingUser.isEmailVerified) {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();

        existingUser.password = hashedPassword;
        existingUser.verificationCode = newCode;
        existingUser.rut = rut;

        await this.userRepository.save(existingUser);
        await this.mailService.sendVerificationEmail(email, newCode);

        throw new UnauthorizedException('PENDING_VERIFICATION');
      }

      throw new ConflictException('EMAIL_ALREADY_EXISTS');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      rut,
      verificationCode: code,
    });

    await this.userRepository.save(user);
    await this.mailService.sendVerificationEmail(email, code);

    return { message: 'REGISTRATION_STARTED' };
  }

  async verifyCode(dto: VerifyCodeDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'verificationCode', 'isEmailVerified'],
    });

    if (!user || user.verificationCode !== dto.code) {
      throw new UnauthorizedException('INVALID_CODE');
    }
    user.isEmailVerified = true;
    user.verificationCode = null;
    await this.userRepository.save(user);

    return { message: 'EMAIL_VERIFIED_SUCCESSFULLY' };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'password', 'isEmailVerified', 'rut'],
    });

    if (!user) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('PENDING_VERIFICATION');
    }

    const payload = { id: user.id, email: user.email, rut: user.rut };
    const token = this.jwtService.sign(payload);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        rut: user.rut,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      return { message: 'FORGOT_PASSWORD_STARTED' };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    user.passwordResetCode = code;
    await this.userRepository.save(user);
    await this.mailService.sendPasswordResetEmail(email, code);

    return { message: 'FORGOT_PASSWORD_STARTED' };
  }

  async verifyResetCode(dto: VerifyResetCodeDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'passwordResetCode'],
    });

    if (!user || user.passwordResetCode !== dto.code) {
      throw new UnauthorizedException('INVALID_CODE');
    }

    return { message: 'CODE_VERIFIED_SUCCESSFULLY' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'password', 'passwordResetCode'],
    });

    if (!user || user.passwordResetCode !== dto.code) {
      throw new UnauthorizedException('INVALID_CODE');
    }

    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(dto.newPassword, salt);
    user.passwordResetCode = null;

    await this.userRepository.save(user);

    return { message: 'PASSWORD_RESET_SUCCESSFULLY' };
  }

  async resendCode(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) throw new UnauthorizedException('USER_NOT_FOUND');
    if (user.isEmailVerified)
      throw new ConflictException('EMAIL_ALREADY_VERIFIED');

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = newCode;

    await this.userRepository.save(user);
    await this.mailService.sendVerificationEmail(email, newCode);

    return { message: 'NEW_CODE_SENT' };
  }
}
