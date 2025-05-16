import dotenv from "dotenv";

const mode = process.env.BUILD_MODE || "dev";
dotenv.config({ path: `.env.${mode}` });

const env = {
  PORT: Number(process.env.PORT) || 8386,
  MONGODB_URI: process.env.MONGODB_URI || "",
  DB_NAME: process.env.DB_NAME || "",
  JWT_SECRETS_AT: process.env.JWT_SECRETS_AT || "access-secret",
  JWT_SECRETS_RT: process.env.JWT_SECRETS_RT || "refresh-secret",
  ACCESS_TOKEN_EXPIRATION: process.env.ACCESS_TOKEN_EXPIRATION || "3600",
  REFRESH_TOKEN_EXPIRATION: process.env.REFRESH_TOKEN_EXPIRATION || "100000",
  ROOT_MAIL: process.env.ROOT_MAIL || "",
  ROOT_PASS: process.env.ROOT_PASS || "",
  AWS_REGION: process.env.AWS_REGION || "",
  AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  BUCKET_NAME: process.env.BUCKET_NAME || "",
  SES_FROM_ADDRESS: process.env.SES_FROM_ADDRESS || "",
  API_KEY: process.env.API_KEY || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
  REDIS_HOST: process.env.REDIS_HOST || "",
  REDIS_PORT: Number(process.env.REDIS_PORT) || 13362,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_MAILPASSWORD: process.env.SMTP_MAILPASSWORD || "",
  SMTP_SENDER: process.env.SMTP_SENDER || "",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",
} as const;

export default env;
