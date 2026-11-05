import { z } from "zod";
import { commitmentSchema, signatureSchema } from "@portavate/crypto";
import { contractVersion, identifier, timestamp, versionNumber } from "@portavate/shared";

export const memoryItemSchema = z.strictObject({
  id: identifier,
  type: z.enum(["fact", "decision", "preference", "requirement", "constraint", "completed_task", "pending_task", "known_issue"]),
  content: identifier,
  source: z.strictObject({ documentId: identifier, locator: identifier, timestamp: timestamp.optional() }),
  importance: z.enum(["low", "normal", "critical"]),
  confidence: z.number().min(0).max(1),
  reviewStatus: z.enum(["pending", "approved", "rejected"]),
  sensitivity: z.enum(["normal", "sensitive"]),
  visibility: z.enum(["owner_only", "scoped"]),
  createdAt: timestamp,
  updatedAt: timestamp,
  expiresAt: timestamp.optional(),
}).refine((item) => Date.parse(item.updatedAt) >= Date.parse(item.createdAt), { path: ["updatedAt"] })
  .refine((item) => !item.expiresAt || Date.parse(item.expiresAt) > Date.parse(item.createdAt), { path: ["expiresAt"] });

export const memoryPackageSchema = z.strictObject({
  schemaVersion: contractVersion,
  packageId: identifier,
  ownerId: identifier,
  sourceType: z.enum(["coding_agent", "chatbot"]),
  sourceCommitment: commitmentSchema,
  items: z.array(memoryItemSchema).min(1),
  createdAt: timestamp,
  updatedAt: timestamp,
}).refine((pkg) => Date.parse(pkg.updatedAt) >= Date.parse(pkg.createdAt), { path: ["updatedAt"] })
  .refine((pkg) => new Set(pkg.items.map((item) => item.id)).size === pkg.items.length, { path: ["items"] });

export const memoryVersionSchema = z.strictObject({
  packageId: identifier,
  version: versionNumber,
  artifactCommitment: commitmentSchema,
});

export const versionManifestSchema = memoryVersionSchema.extend({
  schemaVersion: contractVersion,
  parentVersion: versionNumber.nullable(),
  ownerId: identifier,
  expiresAt: timestamp,
  signature: signatureSchema,
}).refine((manifest) => manifest.version === 1
  ? manifest.parentVersion === null
  : manifest.parentVersion !== null && manifest.parentVersion < manifest.version,
{ path: ["parentVersion"] });

export const accessGrantSchema = z.strictObject({
  schemaVersion: contractVersion,
  grantId: identifier,
  ownerId: identifier,
  recipientId: identifier,
  packageId: identifier,
  version: versionNumber,
  allowedItemIds: z.array(identifier).min(1),
  purpose: identifier,
  expiresAt: timestamp,
  signature: signatureSchema,
}).refine((grant) => new Set(grant.allowedItemIds).size === grant.allowedItemIds.length, { path: ["allowedItemIds"] });

export type MemoryItem = z.infer<typeof memoryItemSchema>;
export type MemoryPackage = z.infer<typeof memoryPackageSchema>;
export type MemoryVersion = z.infer<typeof memoryVersionSchema>;
export type VersionManifest = z.infer<typeof versionManifestSchema>;
export type AccessGrant = z.infer<typeof accessGrantSchema>;
