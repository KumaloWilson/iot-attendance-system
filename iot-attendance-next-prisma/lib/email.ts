import nodemailer from "nodemailer";
import { getEnv } from "@/lib/env";

function isSmtpConfigured() {
  const env = getEnv();
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function createTransport() {
  const env = getEnv();
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
  });
}

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string): Promise<void> {
  if (!isSmtpConfigured()) {
    console.log("[email] SMTP not configured — password reset URL:", resetUrl);
    return;
  }

  const transport = createTransport();
  await transport.sendMail({
    from: getEnv().SMTP_FROM,
    to: toEmail,
    subject: "Password Reset Request",
    text: `You requested a password reset. Visit the link below within 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#003087">Password Reset Request</h2>
        <p>You requested a password reset for your IoT Attendance account.</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}"
             style="background:#003087;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Reset my password
          </a>
        </p>
        <p style="color:#64748b;font-size:13px">This link expires in 30 minutes. If you did not request a reset, you can safely ignore this email.</p>
      </div>`
  });
}

export async function sendLateCheckInEmail(params: {
  employeeName: string;
  employeeNo: string;
  employeeEmail: string | null;
  department: string;
  shiftName: string;
  shiftStart: string;
  checkInTime: Date;
  lateMinutes: number;
  supervisorEmails: string[];
}): Promise<void> {
  if (!isSmtpConfigured()) return;

  const recipients = [
    ...(params.employeeEmail ? [params.employeeEmail] : []),
    ...params.supervisorEmails
  ];
  if (recipients.length === 0) return;

  const checkInStr = params.checkInTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const dateStr = params.checkInTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const subject = `Late Arrival: ${params.employeeName} (${params.employeeNo}) — ${params.lateMinutes} min late`;

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#003087">Late Arrival Notification</h2>
      <p><strong>${params.employeeName}</strong> (${params.employeeNo}) checked in late on ${dateStr}.</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px;margin-top:16px">
        <tr style="background:#f8fafc"><td style="padding:8px 12px;color:#64748b">Check-in time</td><td style="padding:8px 12px;font-weight:600">${checkInStr}</td></tr>
        <tr><td style="padding:8px 12px;color:#64748b">Scheduled start</td><td style="padding:8px 12px">${params.shiftStart} (${params.shiftName})</td></tr>
        <tr style="background:#f8fafc"><td style="padding:8px 12px;color:#64748b">Late by</td><td style="padding:8px 12px;color:#d97706;font-weight:700">${params.lateMinutes} minutes</td></tr>
        <tr><td style="padding:8px 12px;color:#64748b">Department</td><td style="padding:8px 12px">${params.department}</td></tr>
      </table>
      <p style="color:#64748b;font-size:12px;margin-top:24px">This is an automated notification from the IoT Attendance System.</p>
    </div>`;

  const transport = createTransport();
  await transport.sendMail({
    from: getEnv().SMTP_FROM,
    to: recipients,
    subject,
    html
  });
}
