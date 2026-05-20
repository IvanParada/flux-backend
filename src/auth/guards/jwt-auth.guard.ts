import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (info) {
      console.log('[DEBUG AUTH] Info del error:', info.message);
    }

    if (err || !user) {
      console.log('[DEBUG AUTH] Falló la autenticación. User:', user);
      throw (
        err || new UnauthorizedException('Token inválido o no proporcionado')
      );
    }

    return user;
  }
}
