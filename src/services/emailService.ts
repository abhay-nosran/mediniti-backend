import { Resend } from 'resend';
import { ContactFormData, GapAnalysisFormData } from '../types';

// ─── Resend client (HTTP-based — not blocked by Railway's network) ────────────
//
// Railway (and most PaaS platforms) block outbound SMTP ports 25 / 465 / 587,
// which is why nodemailer produced "Connection timeout" errors in production
// even though the same code worked locally.  Resend uses HTTPS (port 443)
// which is always open, making it the correct transport for hosted environments.
//
// Setup (one-time):
//   1. Sign up at https://resend.com — free tier is 3,000 emails/month.
//   2. Add & verify your sending domain (or use the sandbox address for testing).
//   3. Generate an API key and set RESEND_API_KEY in your Railway environment.

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('[Email] RESEND_API_KEY environment variable is not set.');
  }
  return new Resend(apiKey);
}

// ─── Brand constants ──────────────────────────────────────────────────────────

const BRAND_COLOR  = '#2563eb';
const COMPANY_NAME = process.env.COMPANY_NAME ?? 'MediNiti Solution';
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL  ?? 'contact@medineti.com';
const COMPANY_PHONE = process.env.COMPANY_PHONE ?? '+91 9667224884';

// ─── Shared layout wrapper ────────────────────────────────────────────────────

function emailLayout(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${COMPANY_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:8px;overflow:hidden;
                      box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_COLOR};padding:28px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                ${COMPANY_NAME}
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
                Your Vision, Our Strategy
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;
                       padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">
                ${COMPANY_NAME} &bull; ${COMPANY_PHONE} &bull;
                <a href="mailto:${ADMIN_EMAIL}" style="color:${BRAND_COLOR};text-decoration:none;">
                  ${ADMIN_EMAIL}
                </a>
              </p>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:11px;">
                This is an automated email. Please do not reply directly to this message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Helper: labelled data row ────────────────────────────────────────────────

function dataRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
        <span style="color:#6b7280;font-size:13px;font-weight:600;
                     text-transform:uppercase;letter-spacing:0.5px;">
          ${label}
        </span>
        <p style="margin:4px 0 0;color:#111827;font-size:15px;">${value}</p>
      </td>
    </tr>`;
}

// ─── Contact form — user confirmation ─────────────────────────────────────────

function buildContactUserEmail(data: ContactFormData): string {
  const body = `
    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:700;">
      Thank you, ${data.name}!
    </h2>
    <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
      We've received your message and appreciate you reaching out to
      <strong>${COMPANY_NAME}</strong>. Our team will review your enquiry
      and get back to you <strong>within 24 hours</strong>.
    </p>

    <div style="background-color:#eff6ff;border-left:4px solid ${BRAND_COLOR};
                border-radius:4px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#1d4ed8;font-size:14px;font-weight:600;">
        Your submission summary
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${dataRow('Name', data.name)}
      ${dataRow('Organisation', data.organization)}
      ${dataRow('Designation', data.designation)}
      ${dataRow('Email', data.email)}
      ${dataRow('Phone', data.phone)}
      ${dataRow('Message', data.message)}
    </table>

    <p style="margin:0 0 8px;color:#4b5563;font-size:15px;line-height:1.7;">
      If you have any urgent queries, feel free to reach us directly:
    </p>
    <p style="margin:0;color:#4b5563;font-size:15px;">
      📞 <a href="tel:${COMPANY_PHONE}" style="color:${BRAND_COLOR};text-decoration:none;">
            ${COMPANY_PHONE}
          </a><br/>
      ✉️ <a href="mailto:${ADMIN_EMAIL}" style="color:${BRAND_COLOR};text-decoration:none;">
            ${ADMIN_EMAIL}
          </a>
    </p>
  `;
  return emailLayout(body);
}

// ─── Contact form — admin notification ───────────────────────────────────────

function buildContactAdminEmail(data: ContactFormData, ipAddress: string | null): string {
  const body = `
    <h2 style="margin:0 0 4px;color:#111827;font-size:20px;font-weight:700;">
      New Contact Form Submission
    </h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
      Received via the website contact form.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${dataRow('Name', data.name)}
      ${dataRow('Organisation', data.organization)}
      ${dataRow('Designation', data.designation)}
      ${dataRow('Email', `<a href="mailto:${data.email}" style="color:${BRAND_COLOR};">${data.email}</a>`)}
      ${dataRow('Phone', `<a href="tel:${data.phone}" style="color:${BRAND_COLOR};">${data.phone}</a>`)}
      ${dataRow('Message', data.message.replace(/\n/g, '<br/>'))}
      ${ipAddress ? dataRow('IP Address', ipAddress) : ''}
    </table>
  `;
  return emailLayout(body);
}

// ─── Gap analysis — user confirmation ────────────────────────────────────────

function buildGapAnalysisUserEmail(data: GapAnalysisFormData): string {
  const formattedDate = new Date(data.preferredConsultationDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const body = `
    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:700;">
      Your Gap Analysis Request is Confirmed!
    </h2>
    <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
      Dear <strong>${data.name}</strong>, thank you for booking a Gap Analysis
      session with <strong>${COMPANY_NAME}</strong>. We have received your
      request and our expert team will contact you to confirm the appointment.
    </p>

    <div style="background-color:#eff6ff;border-left:4px solid ${BRAND_COLOR};
                border-radius:4px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;color:#1d4ed8;font-size:14px;font-weight:600;">
        Preferred Consultation Date
      </p>
      <p style="margin:0;color:#1e40af;font-size:18px;font-weight:700;">
        📅 ${formattedDate}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${dataRow('Contact Name', data.name)}
      ${dataRow('Hospital / Facility', data.hospitalName)}
      ${dataRow('Facility Type', data.hospitalType)}
      ${dataRow('Number of Beds', String(data.numberOfBeds))}
      ${dataRow('Location', `${data.city}, ${data.state}`)}
      ${dataRow('Email', data.email)}
      ${dataRow('Phone', data.phone)}
      ${dataRow('Accreditation Status', data.accreditationStatus)}
      ${data.additionalNotes ? dataRow('Additional Notes', data.additionalNotes) : ''}
    </table>

    <p style="margin:0 0 8px;color:#4b5563;font-size:15px;line-height:1.7;">
      Our consultant will reach out shortly to confirm your appointment and
      share details about what to expect during the gap analysis session.
    </p>
    <p style="margin:0;color:#4b5563;font-size:15px;">
      📞 <a href="tel:${COMPANY_PHONE}" style="color:${BRAND_COLOR};text-decoration:none;">
            ${COMPANY_PHONE}
          </a><br/>
      ✉️ <a href="mailto:${ADMIN_EMAIL}" style="color:${BRAND_COLOR};text-decoration:none;">
            ${ADMIN_EMAIL}
          </a>
    </p>
  `;
  return emailLayout(body);
}

// ─── Gap analysis — admin notification ───────────────────────────────────────

function buildGapAnalysisAdminEmail(data: GapAnalysisFormData, ipAddress: string | null): string {
  const body = `
    <h2 style="margin:0 0 4px;color:#111827;font-size:20px;font-weight:700;">
      New Gap Analysis Booking
    </h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
      Received via the website gap analysis booking form.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${dataRow('Contact Name', data.name)}
      ${dataRow('Hospital / Facility', data.hospitalName)}
      ${dataRow('Facility Type', data.hospitalType)}
      ${dataRow('Number of Beds', String(data.numberOfBeds))}
      ${dataRow('City', data.city)}
      ${dataRow('State', data.state)}
      ${dataRow('Email', `<a href="mailto:${data.email}" style="color:${BRAND_COLOR};">${data.email}</a>`)}
      ${dataRow('Phone', `<a href="tel:${data.phone}" style="color:${BRAND_COLOR};">${data.phone}</a>`)}
      ${dataRow('Accreditation Status', data.accreditationStatus)}
      ${dataRow('Preferred Consultation Date', data.preferredConsultationDate)}
      ${data.additionalNotes ? dataRow('Additional Notes', data.additionalNotes) : ''}
      ${ipAddress ? dataRow('IP Address', ipAddress) : ''}
    </table>
  `;
  return emailLayout(body);
}

// ─── Public email-sending functions ──────────────────────────────────────────

/**
 * Send both the user confirmation and admin notification for a contact
 * form submission.  Errors are thrown so the route can handle them.
 */
export async function sendContactEmails(
  data: ContactFormData,
  ipAddress: string | null,
): Promise<void> {
  console.log(`[Email] sendContactEmails — starting for ${data.email} (ip: ${ipAddress ?? 'unknown'})`);

  const resend = getResendClient();
  const from = `${COMPANY_NAME} <${process.env.RESEND_FROM_ADDRESS ?? `noreply@${process.env.RESEND_DOMAIN ?? 'yourdomain.com'}`}>`;

  console.log(`[Email] Using from address: ${from}`);
  console.log(`[Email] Sending user confirmation to: ${data.email}`);
  console.log(`[Email] Sending admin notification to: ${ADMIN_EMAIL}`);

  const [userResult, adminResult] = await Promise.all([
    resend.emails.send({
      from,
      to: [data.email],
      subject: `Thank you for contacting ${COMPANY_NAME}`,
      html: buildContactUserEmail(data),
    }),
    resend.emails.send({
      from,
      to: [ADMIN_EMAIL],
      replyTo: data.email,
      subject: `[Contact Form] New enquiry from ${data.name} — ${data.organization}`,
      html: buildContactAdminEmail(data, ipAddress),
    }),
  ]);

  if (userResult.error) {
    console.error('[Email] Failed to send user confirmation:', JSON.stringify(userResult.error));
    throw new Error(`User confirmation email failed: ${userResult.error.message}`);
  }
  if (adminResult.error) {
    console.error('[Email] Failed to send admin notification:', JSON.stringify(adminResult.error));
    throw new Error(`Admin notification email failed: ${adminResult.error.message}`);
  }

  console.log(`[Email] Contact emails sent — user id: ${userResult.data?.id}, admin id: ${adminResult.data?.id}`);
}

/**
 * Send both the user confirmation and admin notification for a gap analysis
 * booking.  Errors are thrown so the route can handle them.
 */
export async function sendGapAnalysisEmails(
  data: GapAnalysisFormData,
  ipAddress: string | null,
): Promise<void> {
  console.log(`[Email] sendGapAnalysisEmails — starting for ${data.email} (ip: ${ipAddress ?? 'unknown'})`);

  const resend = getResendClient();
  const from = `${COMPANY_NAME} <${process.env.RESEND_FROM_ADDRESS ?? `noreply@${process.env.RESEND_DOMAIN ?? 'yourdomain.com'}`}>`;

  console.log(`[Email] Using from address: ${from}`);
  console.log(`[Email] Sending user confirmation to: ${data.email}`);
  console.log(`[Email] Sending admin notification to: ${ADMIN_EMAIL}`);

  const [userResult, adminResult] = await Promise.all([
    resend.emails.send({
      from,
      to: [data.email],
      subject: `Your Gap Analysis Request — ${COMPANY_NAME}`,
      html: buildGapAnalysisUserEmail(data),
    }),
    resend.emails.send({
      from,
      to: [ADMIN_EMAIL],
      replyTo: data.email,
      subject: `[Gap Analysis] New booking from ${data.name} — ${data.hospitalName}`,
      html: buildGapAnalysisAdminEmail(data, ipAddress),
    }),
  ]);

  if (userResult.error) {
    console.error('[Email] Failed to send user confirmation:', JSON.stringify(userResult.error));
    throw new Error(`User confirmation email failed: ${userResult.error.message}`);
  }
  if (adminResult.error) {
    console.error('[Email] Failed to send admin notification:', JSON.stringify(adminResult.error));
    throw new Error(`Admin notification email failed: ${adminResult.error.message}`);
  }

  console.log(`[Email] Gap analysis emails sent — user id: ${userResult.data?.id}, admin id: ${adminResult.data?.id}`);
}
