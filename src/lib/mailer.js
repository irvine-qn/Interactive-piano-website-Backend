const nodemailer = require("nodemailer");
const {
  NODE_ENV,
  RESEND_API_KEY,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
} = require("../config/env");

// Thứ tự chọn cách gửi:
//   1. RESEND_API_KEY -> HTTP API của Resend (dùng khi deploy: Railway gói Hobby chặn cổng SMTP)
//   2. SMTP_HOST      -> Nodemailer qua SMTP
//   3. không có gì    -> in email ra console (chỉ khi chạy local)
const RESEND_URL = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 10_000;

if (!RESEND_API_KEY && !SMTP_HOST && NODE_ENV === "production") {
  throw new Error("Missing required environment variable RESEND_API_KEY or SMTP_HOST");
}

const sendWithResend = async ({ to, subject, text }) => {
  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: MAIL_FROM, to, subject, text }),
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
  });
  if (!response.ok) {
    // Resend trả { name, message } khi lỗi (sai key, domain gửi chưa xác minh...)
    const body = await response.json().catch(() => ({}));
    throw new Error(`Resend ${response.status}: ${body.message || response.statusText}`);
  }
};

const transporter =
  !RESEND_API_KEY && SMTP_HOST
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      })
    : null;

const sendMail = async ({ to, subject, text }) => {
  if (RESEND_API_KEY) return sendWithResend({ to, subject, text });
  if (transporter) return transporter.sendMail({ from: MAIL_FROM, to, subject, text });
  // Chua cau hinh cach gui khi chay local thi in link ra console de thu
  console.log(`[mailer] To: ${to}\nSubject: ${subject}\n${text}\n`);
};

module.exports = { sendMail };
