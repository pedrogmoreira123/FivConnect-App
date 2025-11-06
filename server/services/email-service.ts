/**
 * Email Service - Envio de emails via Resend.com
 */

import { Resend } from 'resend';
import { Logger } from 'pino';

export interface SendInviteEmailParams {
  to: string;
  clientName: string;
  companyName: string;
  inviteToken: string;
  expiresInDays: number;
}

export class EmailService {
  private resend: Resend;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      this.logger.warn('[EmailService] RESEND_API_KEY não configurada. Emails não serão enviados.');
    }

    this.resend = new Resend(apiKey || 'dummy-key');
  }

  /**
   * Enviar email de convite para primeiro acesso
   */
  async sendCompanyInvite(params: SendInviteEmailParams): Promise<void> {
    try {
      if (!process.env.RESEND_API_KEY) {
        this.logger.warn('[EmailService] Skipping email send - RESEND_API_KEY not configured');
        console.log(`\n========== EMAIL DE CONVITE (DEV MODE) ==========`);
        console.log(`Para: ${params.to}`);
        console.log(`Cliente: ${params.clientName}`);
        console.log(`Empresa: ${params.companyName}`);
        console.log(`Link: ${this.getInviteLink(params.inviteToken)}`);
        console.log(`Expira em: ${params.expiresInDays} dias`);
        console.log(`==================================================\n`);
        return;
      }

      const inviteLink = this.getInviteLink(params.inviteToken);

      this.logger.info(`[EmailService] Sending invite email to ${params.to}`);

      const { data, error } = await this.resend.emails.send({
        from: 'FivConnect <noreply@fivconnect.net>',
        to: params.to,
        subject: `Bem-vindo à FivConnect - ${params.companyName}`,
        html: this.getInviteEmailTemplate(params, inviteLink)
      });

      if (error) {
        this.logger.error('[EmailService] Error sending email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      this.logger.info(`[EmailService] Email sent successfully. ID: ${data?.id}`);
    } catch (error: any) {
      this.logger.error('[EmailService] Error in sendCompanyInvite:', error);
      throw error;
    }
  }

  /**
   * Gerar link de convite
   */
  private getInviteLink(token: string): string {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    return `${appUrl}/primeiro-acesso?token=${token}`;
  }

  /**
   * Template HTML do email de convite
   */
  private getInviteEmailTemplate(params: SendInviteEmailParams, link: string): string {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
              color: white;
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .header .emoji {
              font-size: 48px;
              margin-bottom: 10px;
            }
            .content {
              padding: 40px 30px;
            }
            .content p {
              margin: 16px 0;
              color: #4b5563;
            }
            .content strong {
              color: #16a34a;
              font-weight: 600;
            }
            .button-container {
              text-align: center;
              margin: 32px 0;
            }
            .button {
              display: inline-block;
              padding: 14px 32px;
              background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 6px rgba(22, 163, 74, 0.3);
              transition: all 0.3s ease;
            }
            .button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 8px rgba(22, 163, 74, 0.4);
            }
            .info-box {
              background-color: #f0fdf4;
              border-left: 4px solid #16a34a;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-box p {
              margin: 8px 0;
              font-size: 14px;
            }
            .warning {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .warning p {
              margin: 0;
              font-size: 13px;
              color: #92400e;
            }
            .footer {
              background-color: #f9fafb;
              text-align: center;
              padding: 24px 20px;
              border-top: 1px solid #e5e7eb;
            }
            .footer p {
              margin: 8px 0;
              font-size: 12px;
              color: #6b7280;
            }
            .footer a {
              color: #16a34a;
              text-decoration: none;
            }
            .logo {
              font-size: 24px;
              font-weight: 700;
              color: white;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="emoji">🎉</div>
              <h1>Bem-vindo à FivConnect!</h1>
              <div class="logo">FivConnect</div>
            </div>

            <!-- Content -->
            <div class="content">
              <p>Olá <strong>${params.clientName}</strong>,</p>

              <p>É com grande satisfação que informamos que sua empresa <strong>${params.companyName}</strong> foi cadastrada em nossa plataforma!</p>

              <div class="info-box">
                <p><strong>📋 Próximo Passo:</strong></p>
                <p>Para começar a usar todos os recursos da FivConnect, você precisa finalizar seu cadastro criando uma senha de acesso.</p>
              </div>

              <p>Clique no botão abaixo para criar sua senha e acessar a plataforma:</p>

              <div class="button-container">
                <a href="${link}" class="button">Finalizar Cadastro</a>
              </div>

              <div class="warning">
                <p>⏰ <strong>Atenção:</strong> Este link expira em <strong>${params.expiresInDays} dias</strong>. Não se esqueça de finalizar seu cadastro antes do prazo!</p>
              </div>

              <p style="margin-top: 32px;">Após finalizar o cadastro, você terá acesso a:</p>
              <ul style="color: #4b5563; line-height: 1.8;">
                <li>📱 Gestão de conversas do WhatsApp</li>
                <li>👥 Gerenciamento de equipe</li>
                <li>📊 Relatórios e análises</li>
                <li>🤖 Chatbot inteligente com IA</li>
                <li>⚙️ Configurações personalizadas</li>
              </ul>

              <p style="margin-top: 24px;">Se você não solicitou este cadastro ou tem alguma dúvida, entre em contato conosco.</p>

              <p style="margin-top: 32px;">Atenciosamente,<br><strong>Equipe FivConnect</strong></p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p><strong>FivConnect</strong> - Gestão Inteligente de Atendimento</p>
              <p>© ${new Date().getFullYear()} FivConnect. Todos os direitos reservados.</p>
              <p>
                <a href="https://fivconnect.net">www.fivconnect.net</a> |
                <a href="mailto:suporte@fivconnect.net">suporte@fivconnect.net</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Enviar email de reenvio de convite
   */
  async sendInviteReminder(params: SendInviteEmailParams): Promise<void> {
    try {
      if (!process.env.RESEND_API_KEY) {
        this.logger.warn('[EmailService] Skipping reminder email - RESEND_API_KEY not configured');
        return;
      }

      const inviteLink = this.getInviteLink(params.inviteToken);

      this.logger.info(`[EmailService] Sending reminder email to ${params.to}`);

      await this.resend.emails.send({
        from: 'FivConnect <noreply@fivconnect.net>',
        to: params.to,
        subject: `Lembrete: Complete seu cadastro na FivConnect - ${params.companyName}`,
        html: this.getReminderEmailTemplate(params, inviteLink)
      });

      this.logger.info('[EmailService] Reminder email sent successfully');
    } catch (error: any) {
      this.logger.error('[EmailService] Error sending reminder:', error);
      throw error;
    }
  }

  private getReminderEmailTemplate(params: SendInviteEmailParams, link: string): string {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #16a34a;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Lembrete Importante</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${params.clientName}</strong>,</p>

              <p>Notamos que você ainda não finalizou seu cadastro na FivConnect.</p>

              <p>Sua empresa <strong>${params.companyName}</strong> está aguardando sua ativação!</p>

              <p>Clique no botão abaixo para completar seu cadastro:</p>

              <div style="text-align: center;">
                <a href="${link}" class="button">Finalizar Cadastro Agora</a>
              </div>

              <p><small>⚠️ Este link expira em ${params.expiresInDays} dias.</small></p>

              <p>Atenciosamente,<br><strong>Equipe FivConnect</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} FivConnect. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
