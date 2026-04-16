import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendOtpEmailOptions {
  to: string;
  name: string;
  otp: string;
  type: "email-verification" | "forget-password" | "sign-in"; // ← add "sign-in"
}

export const sendOtpEmail = async ({
  to,
  name,
  otp,
  type,
}: SendOtpEmailOptions) => {
  // Don't send email for sign-in OTP type (not used in our flow)
  if (type === "sign-in") return;

  const isVerification = type === "email-verification";

  const subject = isVerification
    ? "Verify your FoodHub account"
    : "Reset your FoodHub password";

  const heading = isVerification ? "Verify Your Email" : "Reset Your Password";

  const bodyText = isVerification
    ? "Thanks for signing up! Use the OTP below to verify your email address. It expires in <strong>10 minutes</strong>."
    : "We received a request to reset your password. Use the OTP below. It expires in <strong>10 minutes</strong>.";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 0; }
          .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 10px; padding: 32px; border: 1px solid #eee; }
          .logo { font-size: 22px; font-weight: bold; color: #f97316; margin-bottom: 8px; }
          h2 { font-size: 20px; color: #111; margin: 16px 0 8px; }
          p { color: #555; font-size: 15px; line-height: 1.6; }
          .otp-box { background: #fff7ed; border: 2px dashed #f97316; border-radius: 8px; text-align: center; padding: 20px; margin: 24px 0; }
          .otp { font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #f97316; }
          .footer { font-size: 12px; color: #aaa; margin-top: 24px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🍽️ FoodHub</div>
          <h2>${heading}</h2>
          <p>Hi <strong>${name}</strong>,</p>
          <p>${bodyText}</p>
          <div class="otp-box">
            <div class="otp">${otp}</div>
          </div>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <div class="footer">© ${new Date().getFullYear()} FoodHub. All rights reserved.</div>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });

  console.log(`OTP email sent to ${to}`);
};
