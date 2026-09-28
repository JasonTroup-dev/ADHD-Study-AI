import "server-only";

import { Environment, Paddle } from "@paddle/paddle-node-sdk";

let paddleClient: Paddle | undefined;

export function getPaddleClient() {
  if (paddleClient) return paddleClient;

  const apiKey = requirePaddleEnv("PADDLE_API_KEY");
  paddleClient = new Paddle(apiKey, {
    environment:
      getPaddleEnvironment() === "sandbox"
        ? Environment.sandbox
        : Environment.production,
  });

  return paddleClient;
}

export function getPaddleEnvironment() {
  return process.env.PADDLE_ENVIRONMENT?.trim().toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

export function getPaddlePriceId() {
  return requirePaddleEnv("PADDLE_PRICE_ID");
}

export function getPaddleWebhookSecret() {
  return requirePaddleEnv("PADDLE_WEBHOOK_SECRET");
}

function requirePaddleEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}
