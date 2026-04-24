export function inviteEmail(args: {
  recipientName: string;
  url: string;
  expiresAt: Date;
}): { subject: string; html: string } {
  return {
    subject: 'You are invited to Naratala HRIS',
    html: `
      <p>Hi ${escape(args.recipientName)},</p>
      <p>You have been invited to join Naratala HRIS. Click the link below to set your password and sign in:</p>
      <p><a href="${escape(args.url)}">${escape(args.url)}</a></p>
      <p>This link expires at ${args.expiresAt.toISOString()}.</p>
      <p>If you did not expect this email, you can safely ignore it.</p>
    `,
  };
}

export function passwordResetEmail(args: {
  url: string;
  expiresAt: Date;
}): { subject: string; html: string } {
  return {
    subject: 'Reset your Naratala HRIS password',
    html: `
      <p>Someone requested a password reset for this account.</p>
      <p><a href="${escape(args.url)}">${escape(args.url)}</a></p>
      <p>This link expires at ${args.expiresAt.toISOString()}.</p>
      <p>If you did not request this, ignore this email.</p>
    `,
  };
}

const ENT: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ENT[c]!);
}
