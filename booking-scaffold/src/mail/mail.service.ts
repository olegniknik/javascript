import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/** Данные заявки для письма */
export interface LeadNotificationPayload {
  id: string;
  name: string;
  phone: string;
  problem?: string | null;
  createdAt: Date;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    if (host && user && pass) {
      const portRaw = this.config.get<string>('SMTP_PORT');
      const port = portRaw ? Number(portRaw) : 587;
      const secure = this.config.get<string>('SMTP_SECURE') === 'true';
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        requireTLS: !secure && port === 587,
        auth: { user, pass },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      });
      this.logger.log(`Mail (SMTP) configured: ${user} -> LEADS_EMAIL`);
    } else {
      this.logger.warn('Mail (SMTP) not configured: set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env');
    }
  }

  /** Проверка: настроена ли отправка писем */
  isConfigured(): boolean {
    return this.transporter !== null;
  }

  /**
   * Отправить уведомление о новой заявке на LEADS_EMAIL.
   * Если SMTP не настроен — ничего не делаем. При ошибке отправки — логируем, не бросаем.
   */
  async sendLeadNotification(lead: LeadNotificationPayload): Promise<void> {
    if (!this.transporter) {
      this.logger.debug('SMTP not configured, skip sending lead email');
      return;
    }

    const to = this.config.get<string>('LEADS_EMAIL');
    const from = this.config.get<string>('MAIL_FROM') || this.config.get<string>('SMTP_USER');
    if (!to || !from) {
      this.logger.debug('LEADS_EMAIL or MAIL_FROM not set, skip sending lead email');
      return;
    }

    const subject = `Новая заявка с сайта: ${lead.name}`;
    const body = this.buildLeadEmailBody(lead);

    // Логирование запроса
    this.logger.log(`Sending lead email: to=${to}, subject=${subject}, leadId=${lead.id}`);

    try {
      const result = await this.transporter.sendMail({
        from,
        to,
        subject,
        text: body,
      });
      // Логирование ответа (успех)
      this.logger.log(
        `Lead email sent: leadId=${lead.id}, messageId=${result.messageId ?? 'n/a'}`,
      );
    } catch (err) {
      // Логирование ответа (ошибка) — не блокируем основное действие
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Lead email failed: leadId=${lead.id}, error=${message}`, err instanceof Error ? err.stack : undefined);
    }
  }

  private buildLeadEmailBody(lead: LeadNotificationPayload): string {
    const lines: string[] = [
      `Имя: ${lead.name}`,
      `Телефон: ${lead.phone}`,
      lead.problem ? `Проблема: ${lead.problem}` : null,
      `Дата заявки: ${lead.createdAt.toLocaleString('ru')}`,
    ].filter(Boolean) as string[];
    return lines.join('\n');
  }
}
