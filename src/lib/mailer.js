const nodemailer = require("nodemailer");
const { NODE_ENV, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = require("../config/env");

const isConfigured = Boolean(SMTP_HOST);

if (!isConfigured && NODE_ENV === "production") {
  throw new Error("Missing required environment variable SMTP_HOST");
}

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    })
  : null;

// Chua cau hinh SMTP khi chay local thi in link ra console de thu
const sendMail = async ({ to, subject, text }) => {
  if (!transporter) {
    console.log(`[mailer] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  await transporter.sendMail({ from: MAIL_FROM, to, subject, text });
};

module.exports = { sendMail };
