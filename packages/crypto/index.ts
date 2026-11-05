import { z } from "zod";
import { identifier } from "@portavate/shared";

// These schemas validate wire formats. Cryptographic verification belongs to the issuer or verifier.
export const commitmentSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
export const signatureSchema = z.strictObject({
  algorithm: z.enum(["ed25519", "eip191"]),
  keyId: identifier,
  value: z.base64url().min(1),
});
