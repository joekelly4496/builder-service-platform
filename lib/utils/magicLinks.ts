import crypto from "crypto";

export function generateMagicToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateMagicLink(token: string, baseUrl: string): string {
  return `${baseUrl}/sub/${token}`;
}
