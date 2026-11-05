import { z } from "zod";
import { identifier } from "@portavate/shared";

export const zeroGEvidenceSchema = z.strictObject({
  preparationRequestIds: z.array(identifier).min(1),
  evaluationRequestIds: z.array(identifier).min(1),
  model: identifier,
  route: z.enum(["verified", "private"]),
});
export type ZeroGEvidence = z.infer<typeof zeroGEvidenceSchema>;
