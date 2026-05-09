import {
  Controller,
  Post,
  Body,
  Patch,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { AuthService } from './services/auth.service';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { UpdateBankDataDto } from './dto/update-bank-data.dto';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify')
  verify(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('verify-reset-code')
  verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('resend-code')
  resendCode(@Body('email') email: string) {
    return this.authService.resendCode(email);
  }

  @Patch('bank-data')
  async updateBankData(
    @Headers('authorization') authHeader: string,
    @Body() dto: UpdateBankDataDto,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Se requiere un token de autenticación válido',
      );
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = this.jwtService.verify(token);

      if (!payload || !payload.id) {
        throw new UnauthorizedException(
          'Token no contiene información de usuario',
        );
      }

      return await this.authService.updateBankData(payload.id, dto);
    } catch (error) {
      this.logger.error(`Error de autenticación: ${error.message}`);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
