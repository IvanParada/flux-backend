import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login() {
    console.log('LOGIN EXECUTED')
    return this.authService.login();
  }

  @Post('register')
  register() {
    console.log('REGISTER EXECUTED')
    return this.authService.register();
  }
}
