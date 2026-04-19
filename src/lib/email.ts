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

// ─── Order Emails ──────────────────────────────────────────────────

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface SendOrderConfirmationOptions {
  to: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: string;
  paymentUrl: string;
}

export const sendOrderConfirmationEmail = async (
  options: SendOrderConfirmationOptions,
) => {
  const {
    to,
    customerName,
    orderNumber,
    items,
    subtotal,
    deliveryFee,
    total,
    deliveryAddress,
    paymentUrl,
  } = options;

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#374151;">${item.name}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:center;color:#374151;">x${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151;">৳${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`,
    )
    .join("");

  const html = `
    <!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <style>
      body{font-family:Arial,sans-serif;background:#f9f9f9;margin:0;padding:0;}
      .container{max-width:520px;margin:40px auto;background:#fff;border-radius:10px;padding:32px;border:1px solid #eee;}
      .logo{font-size:22px;font-weight:bold;color:#f97316;margin-bottom:4px;}
      .badge{display:inline-block;background:#fff7ed;color:#f97316;border:1px solid #fed7aa;border-radius:20px;padding:4px 14px;font-size:13px;font-weight:600;margin-bottom:16px;}
      h2{font-size:20px;color:#111;margin:0 0 8px;}
      p{color:#555;font-size:15px;line-height:1.6;margin:0 0 12px;}
      table{width:100%;border-collapse:collapse;margin:16px 0;}
      .info-box{background:#f9fafb;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:14px;color:#374151;}
      .pay-btn{display:block;background:#f97316;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:8px;font-size:16px;font-weight:bold;margin:24px 0;}
      .footer{font-size:12px;color:#aaa;margin-top:24px;text-align:center;}
    </style></head>
    <body><div class="container">
      <div class="logo">🍽️ FoodHub</div>
      <span class="badge">Order Placed</span>
      <h2>Your order is confirmed!</h2>
      <p>Hi <strong>${customerName}</strong>, we've received your order. Complete payment to start preparing your food.</p>
      <div class="info-box">
        <strong>Order Number:</strong> ${orderNumber}<br/>
        <strong>Delivery to:</strong> ${deliveryAddress}
      </div>
      <table>
        <thead><tr>
          <th style="text-align:left;padding-bottom:8px;color:#6b7280;font-size:13px;">Item</th>
          <th style="text-align:center;padding-bottom:8px;color:#6b7280;font-size:13px;">Qty</th>
          <th style="text-align:right;padding-bottom:8px;color:#6b7280;font-size:13px;">Price</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:8px 0;color:#6b7280;font-size:14px;">Subtotal</td>
            <td style="padding:8px 0;text-align:right;color:#374151;">৳${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:8px 0;color:#6b7280;font-size:14px;">Delivery Fee</td>
            <td style="padding:8px 0;text-align:right;color:#374151;">৳${deliveryFee.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:10px 0;font-weight:bold;color:#111;font-size:16px;">Total</td>
            <td style="padding:10px 0;text-align:right;font-weight:bold;color:#111;font-size:16px;">৳${total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <a href="${paymentUrl}" class="pay-btn">Complete Payment →</a>
      <p style="font-size:13px;color:#9ca3af;text-align:center;">Payment link expires — complete it soon to confirm your order.</p>
      <div class="footer">© ${new Date().getFullYear()} FoodHub. All rights reserved.</div>
    </div></body></html>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Order Confirmed — ${orderNumber} | FoodHub`,
    html,
  });

  console.log(`Order confirmation email sent to ${to}`);
};

// ─────────────────────────────────────────────────────────────────

interface SendPaymentSuccessOptions {
  to: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  total: number;
}

export const sendPaymentSuccessEmail = async (
  options: SendPaymentSuccessOptions,
) => {
  const { to, customerName, orderNumber, total } = options;

  const html = `
    <!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <style>
      body{font-family:Arial,sans-serif;background:#f9f9f9;margin:0;padding:0;}
      .container{max-width:520px;margin:40px auto;background:#fff;border-radius:10px;padding:32px;border:1px solid #eee;}
      .logo{font-size:22px;font-weight:bold;color:#f97316;margin-bottom:4px;}
      .badge{display:inline-block;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:20px;padding:4px 14px;font-size:13px;font-weight:600;margin-bottom:16px;}
      h2{font-size:20px;color:#111;margin:0 0 8px;}
      p{color:#555;font-size:15px;line-height:1.6;margin:0 0 12px;}
      .info-box{background:#f9fafb;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:14px;color:#374151;}
      .footer{font-size:12px;color:#aaa;margin-top:24px;text-align:center;}
    </style></head>
    <body><div class="container">
      <div class="logo">🍽️ FoodHub</div>
      <span class="badge">✓ Payment Successful</span>
      <h2>Payment received!</h2>
      <p>Hi <strong>${customerName}</strong>, your payment was successful. Your food is now being prepared!</p>
      <div class="info-box">
        <strong>Order Number:</strong> ${orderNumber}<br/>
        <strong>Amount Paid:</strong> ৳${total.toFixed(2)}
      </div>
      <p>You'll receive another update when your order is ready for delivery.</p>
      <div class="footer">© ${new Date().getFullYear()} FoodHub. All rights reserved.</div>
    </div></body></html>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Payment Received — ${orderNumber} | FoodHub`,
    html,
  });

  console.log(`Payment success email sent to ${to}`);
};

// ─────────────────────────────────────────────────────────────────

interface SendOrderStatusUpdateOptions {
  to: string;
  customerName: string;
  orderNumber: string;
  status: "PREPARING" | "READY" | "DELIVERED";
}

export const sendOrderStatusUpdateEmail = async (
  options: SendOrderStatusUpdateOptions,
) => {
  const { to, customerName, orderNumber, status } = options;

  const statusConfig = {
    PREPARING: {
      badge: "👨‍🍳 Being Prepared",
      badgeStyle: "background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;",
      heading: "Your order is being prepared!",
      message:
        "Great news! The restaurant has started preparing your food. It won't be long now.",
    },
    READY: {
      badge: "✓ Ready for Delivery",
      badgeStyle: "background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;",
      heading: "Your order is ready!",
      message: "Your food is ready and will be on its way to you very soon.",
    },
    DELIVERED: {
      badge: "🎉 Delivered",
      badgeStyle: "background:#fdf4ff;color:#7e22ce;border:1px solid #e9d5ff;",
      heading: "Order delivered!",
      message:
        "Your order has been delivered. Enjoy your meal! If you loved it, don't forget to leave a review.",
    },
  };

  const config = statusConfig[status];

  const html = `
    <!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <style>
      body{font-family:Arial,sans-serif;background:#f9f9f9;margin:0;padding:0;}
      .container{max-width:520px;margin:40px auto;background:#fff;border-radius:10px;padding:32px;border:1px solid #eee;}
      .logo{font-size:22px;font-weight:bold;color:#f97316;margin-bottom:4px;}
      .badge{display:inline-block;border-radius:20px;padding:4px 14px;font-size:13px;font-weight:600;margin-bottom:16px;${config.badgeStyle}}
      h2{font-size:20px;color:#111;margin:0 0 8px;}
      p{color:#555;font-size:15px;line-height:1.6;margin:0 0 12px;}
      .info-box{background:#f9fafb;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:14px;color:#374151;}
      .footer{font-size:12px;color:#aaa;margin-top:24px;text-align:center;}
    </style></head>
    <body><div class="container">
      <div class="logo">🍽️ FoodHub</div>
      <span class="badge">${config.badge}</span>
      <h2>${config.heading}</h2>
      <p>Hi <strong>${customerName}</strong>, ${config.message}</p>
      <div class="info-box"><strong>Order Number:</strong> ${orderNumber}</div>
      <div class="footer">© ${new Date().getFullYear()} FoodHub. All rights reserved.</div>
    </div></body></html>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Order Update: ${config.badge} — ${orderNumber} | FoodHub`,
    html,
  });

  console.log(`Order status email (${status}) sent to ${to}`);
};

// ─────────────────────────────────────────────────────────────────

interface SendOrderCancelledOptions {
  to: string;
  customerName: string;
  orderNumber: string;
}

export const sendOrderCancelledEmail = async (
  options: SendOrderCancelledOptions,
) => {
  const { to, customerName, orderNumber } = options;

  const html = `
    <!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <style>
      body{font-family:Arial,sans-serif;background:#f9f9f9;margin:0;padding:0;}
      .container{max-width:520px;margin:40px auto;background:#fff;border-radius:10px;padding:32px;border:1px solid #eee;}
      .logo{font-size:22px;font-weight:bold;color:#f97316;margin-bottom:4px;}
      .badge{display:inline-block;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:20px;padding:4px 14px;font-size:13px;font-weight:600;margin-bottom:16px;}
      h2{font-size:20px;color:#111;margin:0 0 8px;}
      p{color:#555;font-size:15px;line-height:1.6;margin:0 0 12px;}
      .info-box{background:#f9fafb;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:14px;color:#374151;}
      .footer{font-size:12px;color:#aaa;margin-top:24px;text-align:center;}
    </style></head>
    <body><div class="container">
      <div class="logo">🍽️ FoodHub</div>
      <span class="badge">Order Cancelled</span>
      <h2>Your order has been cancelled</h2>
      <p>Hi <strong>${customerName}</strong>, your order has been successfully cancelled.</p>
      <div class="info-box"><strong>Order Number:</strong> ${orderNumber}</div>
      <p>If you were charged, your refund will be processed within 5-10 business days.</p>
      <div class="footer">© ${new Date().getFullYear()} FoodHub. All rights reserved.</div>
    </div></body></html>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Order Cancelled — ${orderNumber} | FoodHub`,
    html,
  });

  console.log(`Order cancelled email sent to ${to}`);
};
