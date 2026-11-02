import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Must sit beside the database — the stored key is useless without it.
const SECRET_FILE = path.join(
  process.env.DATA_DIR?.trim() || path.join(process.cwd(), "data"),
  ".secret"
);

/**
 * Key-encryption key.
 *
 * Prefers APP_SECRET so a deployment can supply it out of band. Otherwise a
 * random key is generated once and kept beside the database with 0600
 * permissions — that keeps stored secrets out of reach of a database dump
 * alone, which is the realistic leak for a file-backed app.
 */
function encryptionKey(): Buffer {
  const fromEnv = process.env.APP_SECRET?.trim();
  if (fromEnv) return crypto.createHash("sha256").update(fromEnv).digest();

  try {
    if (fs.existsSync(SECRET_FILE)) {
      return Buffer.from(fs.readFileSync(SECRET_FILE, "utf8").trim(), "hex");
    }
  } catch {
    // Fall through and regenerate.
  }

  const generated = crypto.randomBytes(32);
  fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
  fs.writeFileSync(SECRET_FILE, generated.toString("hex"), { mode: 0o600 });
  return generated;
}

/** AES-256-GCM. Output is `v1:iv:tag:ciphertext`, all base64url. */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    enc.toString("base64url"),
  ].join(":");
}

export function decryptSecret(stored: string): string {
  if (!stored) return "";
  const [version, ivB64, tagB64, dataB64] = stored.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) return "";

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivB64, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Wrong key or tampered ciphertext — treat as absent rather than throwing.
    return "";
  }
}

/** "…" plus the last 4 characters, for showing a key without revealing it. */
export function maskSecret(plain: string): string {
  if (!plain) return "";
  return plain.length <= 4 ? "••••" : `••••${plain.slice(-4)}`;
}
