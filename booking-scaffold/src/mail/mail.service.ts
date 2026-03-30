import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LeadNotificationPayload {
  id: string;
  name: string;
  phone: string;
  problem?: string | null;
  createdAt: Date;
}

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {
    if (this.getBrevoApiKey()) {
      this.logger.log('Mail configured via Brevo Transactional API');
    } else {
      this.logger.warn('BREVO_API_KEY not set — email notifications disabled');
    }
  }

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('BREVO_API_KEY')?.trim());
  }

  private getBrevoApiKey(): string | undefined {
    return this.config.get<string>('BREVO_API_KEY')?.trim();
  }

  async sendLeadNotification(lead: LeadNotificationPayload): Promise<void> {
    const apiKey = this.getBrevoApiKey();
    if (!apiKey) {
      this.logger.debug('Brevo not configured, skip sending lead email');
      return;
    }

    const to = this.config.get<string>('LEADS_EMAIL')?.trim();
    const fromEmail = this.config.get<string>('MAIL_FROM')?.trim();
    if (!to || !fromEmail) {
      this.logger.debug('LEADS_EMAIL or MAIL_FROM not set, skip sending lead email');
      return;
    }

    const senderName =
      this.config.get<string>('BREVO_SENDER_NAME')?.trim() || 'Заявки с сайта';
    const { name: parsedName, email: parsedEmail } = this.parseMailFrom(fromEmail);
    const email = parsedEmail ?? this.extractPlainEmail(fromEmail);
    if (!email) {
      this.logger.warn(`MAIL_FROM is not a valid email: ${fromEmail.slice(0, 80)}`);
      return;
    }
    const sender = {
      name: parsedName && parsedName.length > 0 ? parsedName : senderName,
      email,
    };

    const subject = `Новая заявка с сайта: ${lead.name}`;
    const textContent = this.buildLeadEmailBody(lead);

    this.logger.log(`Sending lead email via Brevo: to=${to}, leadId=${lead.id}`);

    try {
      const res = await fetch(BREVO_SEND_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender,
          to: [{ email: to }],
          subject,
          textContent,
        }),
      });

      const raw = await res.text();
      if (!res.ok) {
        this.logger.error(
          `Brevo HTTP ${res.status}: leadId=${lead.id}, body=${raw.slice(0, 500)}`,
        );
        return;
      }

      let messageId = 'n/a';
      try {
        const json = JSON.parse(raw) as { messageId?: string };
        messageId = json.messageId ?? 'n/a';
      } catch {
        // ignore
      }
      this.logger.log(`Lead email sent: leadId=${lead.id}, messageId=${messageId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Lead email failed: leadId=${lead.id}, error=${message}`, err instanceof Error ? err.stack : undefined);
    }
  }

  /** "Имя <email@x.com>" или просто email */
  private parseMailFrom(from: string): { name: string | null; email: string | null } {
    const lt = from.indexOf('<');
    const gt = from.indexOf('>');
    if (lt !== -1 && gt > lt) {
      const email = from.slice(lt + 1, gt).trim();
      let name = from.slice(0, lt).trim().replace(/^["']|["']$/g, '');
      return { name: name || null, email: email || null };
    }
    return { name: null, email: null };
  }

  private extractPlainEmail(s: string): string | null {
    const t = s.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : null;
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
