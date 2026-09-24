import nodemailer from 'nodemailer';

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function createMailTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: requiredEnv('SMTP_HOST'),
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: {
      user: requiredEnv('SMTP_USER'),
      pass: requiredEnv('SMTP_PASSWORD'),
    },
  });
}

export function getMailFrom() {
  const address = process.env.SMTP_FROM?.trim() || requiredEnv('SMTP_USER');
  const name = process.env.SMTP_FROM_NAME?.trim();
  return name ? `${name} <${address}>` : address;
}
