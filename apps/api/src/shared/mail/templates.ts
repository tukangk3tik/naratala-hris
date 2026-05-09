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

export function leaveRequestSubmittedEmail(args: {
  approverName: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: string;
}): { subject: string; html: string } {
  return {
    subject: `Time-off request: ${args.employeeName}`,
    html: `<p>${escape(args.employeeName)} requested ${escape(args.leaveType)} from ${escape(args.fromDate)} to ${escape(args.toDate)} (${escape(args.days)} days).</p><p>Please review in Naratala HRIS.</p>`,
  };
}

export function leaveRequestDecidedEmail(args: {
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  decision: 'approved' | 'declined';
  note?: string;
}): { subject: string; html: string } {
  return {
    subject: `Your time-off request was ${args.decision}`,
    html: `<p>Your ${escape(args.leaveType)} request (${escape(args.fromDate)} → ${escape(args.toDate)}) has been ${args.decision}.</p>${args.note ? `<p>Note: ${escape(args.note)}</p>` : ''}`,
  };
}

export function leaveRequestCancelledEmail(args: {
  approverName: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
}): { subject: string; html: string } {
  return {
    subject: `Time-off cancelled: ${args.employeeName}`,
    html: `<p>${escape(args.employeeName)} cancelled their ${escape(args.leaveType)} request (${escape(args.fromDate)} → ${escape(args.toDate)}).</p>`,
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
