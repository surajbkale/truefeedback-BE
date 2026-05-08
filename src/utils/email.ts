import { Resend } from "resend";

const resend = new Resend(process.env["RESEND_API_KEY"]);
const FROM = process.env["EMAIL_FROM"] ?? "noreply@truefeedback.app";
const APP_URL = process.env["FRONTEND_URL"] ?? "http://localhost:3000";

// ── Shared styles ─────────────────────────────────────────────────────────────
const base = (content: string) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px;
              overflow: hidden; border: 1px solid #e5e7eb;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
                padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;
                 letter-spacing: -0.5px;">💬 True Feedback</h1>
    </div>
    <!-- Body -->
    <div style="padding: 32px 40px;">
      ${content}
    </div>
    <!-- Footer -->
    <div style="padding: 20px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb;
                text-align: center;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        You're receiving this because you have notifications enabled on
        <a href="${APP_URL}" style="color: #6366f1;">truefeedback.app</a>.
        <br>
        <a href="${APP_URL}/dashboard" style="color: #6366f1;">Manage notification settings</a>
      </p>
    </div>
  </div>
`;

// ── Instant notification email ─────────────────────────────────────────────────

export async function sendMessageNotificationEmail(
  to: string,
  username: string,
  messageContent: string
): Promise<void> {
  const dashboardUrl = `${APP_URL}/dashboard`;

  const html = base(`
    <h2 style="margin: 0 0 8px; color: #111827; font-size: 20px;">
      You have a new anonymous message, @${username}! 🎉
    </h2>
    <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
      Someone sent you a message on True Feedback.
    </p>

    <!-- Message bubble -->
    <div style="background: #f3f4f6; border-left: 4px solid #6366f1;
                border-radius: 8px; padding: 16px 20px; margin-bottom: 28px;">
      <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6;">
        ${messageContent}
      </p>
    </div>

    <a href="${dashboardUrl}"
       style="display: inline-block; background: #4f46e5; color: #ffffff;
              text-decoration: none; border-radius: 8px; padding: 12px 28px;
              font-size: 15px; font-weight: 600;">
      View on Dashboard →
    </a>
  `);

  await resend.emails.send({
    from: FROM,
    to,
    subject: `@${username} — you got a new anonymous message 💬`,
    html,
  });
}

// ── Daily digest email ─────────────────────────────────────────────────────────

export async function sendDigestEmail(
  to: string,
  username: string,
  messages: { content: string; createdAt: Date }[]
): Promise<void> {
  const dashboardUrl = `${APP_URL}/dashboard`;
  const count = messages.length;

  const messageItems = messages
    .map(
      (m) => `
      <div style="background: #f3f4f6; border-left: 4px solid #6366f1;
                  border-radius: 8px; padding: 14px 18px; margin-bottom: 12px;">
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
          ${m.content}
        </p>
        <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">
          ${m.createdAt.toLocaleString("en-US", {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>`
    )
    .join("");

  const html = base(`
    <h2 style="margin: 0 0 8px; color: #111827; font-size: 20px;">
      Your daily digest, @${username} 📬
    </h2>
    <p style="color: #6b7280; margin: 0 0 24px; font-size: 15px;">
      You received <strong>${count} anonymous message${count !== 1 ? "s" : ""}</strong>
      in the last 24 hours.
    </p>

    ${messageItems}

    <a href="${dashboardUrl}"
       style="display: inline-block; margin-top: 16px; background: #4f46e5; color: #ffffff;
              text-decoration: none; border-radius: 8px; padding: 12px 28px;
              font-size: 15px; font-weight: 600;">
      View all messages →
    </a>
  `);

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your True Feedback digest — ${count} new message${count !== 1 ? "s" : ""} 📬`,
    html,
  });
}
