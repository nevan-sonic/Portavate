import { describe, expect, it } from "vitest";
import { accessGrantSchema, memoryItemSchema, versionManifestSchema } from "@portavate/memory-core";
import { expiry, manifest, memoryItem, signature } from "./fixtures.ts";

describe("memory contracts", () => {
  it("accepts a valid memory item", () => {
    expect(memoryItemSchema.safeParse(memoryItem).success).toBe(true);
  });

  it("rejects invalid content, item type, and confidence", () => {
    for (const change of [{ content: "" }, { type: "invented" }, { confidence: 2 }]) {
      expect(memoryItemSchema.safeParse({ ...memoryItem, ...change }).success).toBe(false);
    }
  });

  it("rejects malformed and reversed timestamps", () => {
    expect(memoryItemSchema.safeParse({ ...memoryItem, createdAt: "2026-02-30T00:00:00Z" }).success).toBe(false);
    expect(memoryItemSchema.safeParse({ ...memoryItem, createdAt: expiry }).success).toBe(false);
  });

  it("rejects malformed commitments and non-ancestral parents", () => {
    expect(versionManifestSchema.safeParse(manifest).success).toBe(true);
    expect(versionManifestSchema.safeParse({ ...manifest, artifactCommitment: "wrong" }).success).toBe(false);
    expect(versionManifestSchema.safeParse({ ...manifest, version: 2, parentVersion: 2 }).success).toBe(false);
  });

  it("rejects invalid recipient scope and duplicate item IDs", () => {
    const grant = {
      schemaVersion: 1, grantId: "test-grant", ownerId: "test-owner", recipientId: "test-recipient",
      packageId: "test-package", version: 1, allowedItemIds: ["test-item"], purpose: "fixture", expiresAt: expiry,
      signature,
    };
    expect(accessGrantSchema.safeParse(grant).success).toBe(true);
    expect(accessGrantSchema.safeParse({ ...grant, allowedItemIds: ["test-item", "test-item"] }).success).toBe(false);
    expect(accessGrantSchema.safeParse({ ...grant, recipientId: "" }).success).toBe(false);
  });
});
