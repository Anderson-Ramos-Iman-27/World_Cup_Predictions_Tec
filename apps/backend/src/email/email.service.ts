import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type SendCodeParams = {
  to: string;
  subject: string;
  code: string;
  purpose: 'email-verification' | 'password-reset';
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendCode({ to, subject, code, purpose }: SendCodeParams) {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const from = this.configService.get<string>(
      'SMTP_FROM',
      'World Cup Predictions <no-reply@example.com>',
    );

    const content = this.buildCodeEmail({ code, purpose });

    if (!host) {
      this.logger.warn(
        `SMTP not configured. Development ${purpose} code for ${to}: ${code}`,
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      ...(user && pass
        ? {
            auth: {
              user,
              pass,
            },
          }
        : {}),
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text: content.text,
      html: content.html,
    });
  }

  private buildCodeEmail({
    code,
    purpose,
  }: {
    code: string;
    purpose: SendCodeParams['purpose'];
  }) {
    const isVerification = purpose === 'email-verification';
    const title = isVerification
      ? 'Verifica tu cuenta'
      : 'Recupera tu contraseña';
    const intro = isVerification
      ? 'Usa este codigo para activar tu cuenta en World Cup Predictions.'
      : 'Usa este código para crear una nueva contraseña de forma segura.';
    const warning = isVerification
      ? 'Si no creaste esta cuenta, puedes ignorar este mensaje.'
      : 'Si no solicitaste recuperar tu contraseña, ignora este mensaje.';

    return {
      text: `${title}\n\n${intro}\n\nCodigo: ${code}\n\nEste codigo expira pronto. ${warning}`,
      html: `
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>${title}</title>
          </head>
          <body style="margin:0;background:#eef3f8;font-family:Arial,Helvetica,sans-serif;color:#102033;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3f8;padding:32px 16px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dbe4ef;box-shadow:0 18px 50px rgba(16,32,51,0.12);">
                    <tr>
                      <td style="background:#1457d9;padding:26px 28px;color:#ffffff;">
                        <div style="font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;opacity:0.85;">World Cup Predictions</div>
                        <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;">${title}</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:30px 28px;">
                        <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#334155;">${intro}</p>
                        <div style="margin:24px 0;padding:22px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;text-align:center;">
                          <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#64748b;">Codigo de seguridad</div>
                          <div style="margin-top:10px;font-size:38px;line-height:1;font-weight:800;letter-spacing:8px;color:#1457d9;">${code}</div>
                        </div>
                        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">Este codigo expira pronto. No lo compartas con nadie.</p>
                        <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">${warning}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                        <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">Mensaje automatico del sistema. No respondas a este correo.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    };
  }
}
