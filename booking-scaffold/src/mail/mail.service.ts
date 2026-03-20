import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

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
  private resend: Resend | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Mail configured via Resend HTTP API');
    } else {
      this.logger.warn('RESEND_API_KEY not set — email notifications disabled');
    }
  }

  isConfigured(): boolean {
    return this.resend !== null;
  }

  async sendLeadNotification(lead: LeadNotificationPayload): Promise<void> {
    if (!this.resend) {
      this.logger.debug('Resend not configured, skip sending lead email');
      return;
    }

    const to = this.config.get<string>('LEADS_EMAIL');
    const from = this.config.get<string>('MAIL_FROM') || 'onboarding@resend.dev';
    if (!to) {
      this.logger.debug('LEADS_EMAIL not set, skip sending lead email');
      return;
    }

    const subject = `Новая заявка с сайта: ${lead.name}`;
    const text = this.buildLeadEmailBody(lead);

    this.logger.log(`Sending lead email via Resend: to=${to}, leadId=${lead.id}`);

    try {
      const { data, error } = await this.resend.emails.send({
        from,
        to: [to],
        subject,
        text,
      });

      if (error) {
        this.logger.error(`Resend error: leadId=${lead.id}, error=${JSON.stringify(error)}`);
        return;
      }

      this.logger.log(`Lead email sent: leadId=${lead.id}, resendId=${data?.id ?? 'n/a'}`);
    } catch (err) {
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
