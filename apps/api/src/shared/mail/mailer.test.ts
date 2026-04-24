import { describe, it, expect, vi } from 'vitest';
import { createMailer } from './mailer.js';

describe('mailer', () => {
  it('calls sendMail with the configured from + passed to/subject/html', async () => {
    const sendMail = vi.fn().mockResolvedValue({ accepted: ['a@b.co'] });
    const transport = { sendMail } as any;
    const mailer = createMailer({ transport, from: 'Naratala <n@x.co>' });

    await mailer.send({ to: 'a@b.co', subject: 'Hi', html: '<p>Hello</p>' });

    expect(sendMail).toHaveBeenCalledWith({
      from: 'Naratala <n@x.co>',
      to: 'a@b.co',
      subject: 'Hi',
      html: '<p>Hello</p>',
      text: 'Hello',
    });
  });

  it('swallows transport errors and logs (never throws)', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('smtp down'));
    const mailer = createMailer({ transport: { sendMail } as any, from: 'x@y.co' });
    await expect(mailer.send({ to: 'a@b.co', subject: 's', html: '<p>h</p>' })).resolves.toEqual({
      ok: false,
    });
  });
});
