import nodemailer, { type Transporter } from 'nodemailer';
import { logger } from '../logger.js';

interface Config {
  transport: Pick<Transporter, 'sendMail'>;
  from: string;
}

export interface Mailer {
  send: (input: { to: string; subject: string; html: string }) => Promise<{ ok: boolean }>;
}

export function createMailer(cfg: Config): Mailer {
  async function send(input: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ ok: boolean }> {
    try {
      const text = input.html.replace(/<[^>]+>/g, '').trim();
      await cfg.transport.sendMail({
        from: cfg.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text,
      });
      return { ok: true };
    } catch (err) {
      logger.error({ err, to: input.to, subject: input.subject }, 'mail send failed');
      return { ok: false };
    }
  }
  return { send };
}

export function createSmtpTransport(cfg: {
  host: string;
  port: number;
  user?: string;
  pass?: string;
}): Transporter {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: false,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
}
