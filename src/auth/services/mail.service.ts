import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendCodeEmail(email: string, code: string, subject: string) {
    return this.resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'flux.dev.app@gmail.com',
      // to: email, //TODO: Change to email param
      subject,
      html: `<p><b>FLUX</b><br>Tu código es: <strong>${code}</strong></p>`,
    });
  }
  async sendVerificationEmail(email: string, code: string) {
    return this.sendCodeEmail(
      'flux.dev.app@gmail.com',
      code,
      'Código de Verificación FLUX',
    );
  }

  async sendPasswordResetEmail(email: string, code: string) {
    return this.sendCodeEmail(
      'flux.dev.app@gmail.com',
      code,
      'Código para recuperar contraseña FLUX',
    );
  }
}
