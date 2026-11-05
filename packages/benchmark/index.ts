// Keep the benchmark's comparison conditions consistent across future runners and reports.
export const benchmarkConditions = {
  standard: "Standard Port",
  initial: "Portavate Initial Transfer",
  repaired: "Portavate After Repair",
} as const;
export type BenchmarkCondition = keyof typeof benchmarkConditions;
