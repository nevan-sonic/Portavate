import { z } from "zod";
import { memoryItemSchema, memoryPackageSchema } from "./index.ts";

export const sourceByteLimit = 16 * 1024;
export const importBodyLimit = 128 * 1024;
const formatSchema = z.enum(["txt", "md", "json"]);
export const importSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  format: formatSchema,
  text: z.string().min(1),
  sourceType: memoryPackageSchema.shape.sourceType,
  sensitive: z.boolean(),
});
export const sourceSegmentSchema = z.strictObject({
  id: z.string(),
  label: z.string(),
  text: z.string(),
});
export type SourceSegment = z.infer<typeof sourceSegmentSchema>;

const conversationSchema = z.strictObject({
  messages: z.array(z.strictObject({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1).refine((value) => value.trim().length > 0),
  })).min(1).max(100),
});

export function segmentSource(format: z.infer<typeof formatSchema>, text: string): SourceSegment[] {
  const sections = format === "json"
    ? conversationSchema.parse(JSON.parse(text.replace(/^\uFEFF/, ""))).messages.map(({ role, content }, index) =>
      ({ label: `Message ${index + 1} · ${role}`, text: content }))
    : [{ label: format === "md" ? "Markdown" : "Text", text }];
  const segments: SourceSegment[] = [];
  for (const section of sections) {
    const characters = Array.from(section.text);
    for (let offset = 0; offset < characters.length; offset += 2000) {
      const passage = characters.slice(offset, offset + 2000).join("");
      if (passage.trim()) {
        const number = segments.length + 1;
        segments.push({ id: `s${number}`, label: `${section.label} · segment ${number}`, text: passage });
      }
    }
  }
  if (!segments.length) throw new Error("Source must contain readable text.");
  return segments;
}

export const extractedItemSchema = z.strictObject({
  type: memoryItemSchema.shape.type,
  content: z.string().trim().min(1).max(2000),
  segmentId: z.string().regex(/^s[1-9][0-9]*$/),
  quote: z.string().min(1).max(1000).refine((value) => value.trim().length > 0),
  importance: memoryItemSchema.shape.importance,
  confidence: memoryItemSchema.shape.confidence.optional(),
  sensitivity: memoryItemSchema.shape.sensitivity,
});
export const extractionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  items: z.array(extractedItemSchema).max(24),
});
export const reviewSchema = z.strictObject({
  revision: z.number().int().nonnegative(),
  content: extractedItemSchema.shape.content,
  reviewStatus: memoryItemSchema.shape.reviewStatus,
  visibility: memoryItemSchema.shape.visibility,
  sensitivity: memoryItemSchema.shape.sensitivity,
});
export type ImportInput = z.infer<typeof importSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type Extraction = z.infer<typeof extractionSchema>;
