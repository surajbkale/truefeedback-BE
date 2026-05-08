import { Resend } from "resend";

const resend = new Resend(process.env["RESEND_API_KEY"]);
const FROM = process.env["EMAIL_FROM"] ?? "noreply@truefeedback.app";

export async function sendVerificationEmail(
  to: string,
  username: string,
  code: string
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Verify your TrueFeedback account",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Welcome to TrueFeedback, ${username}!</h2>
        <p>Use the code below to verify your email address. It expires in <strong>1 hour</strong>.</p>
        <div style="
          font-size: 2rem;
          font-weight: bold;
          letter-spacing: 0.25em;
          background: #f4f4f5;
          border-radius: 8px;
          padding: 16px 24px;
          text-align: center;
          margin: 24px 0;
        ">${code}</div>
        <p style="color: #71717a; font-size: 0.875rem;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
