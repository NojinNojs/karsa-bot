import { WORK_DILEMMAS_PART1, type WorkDilemma } from "./dilemmasPart1.ts";
import { WORK_DILEMMAS_PART1B } from "./dilemmasPart1B.ts";
import { WORK_DILEMMAS_PART2 } from "./dilemmasPart2.ts";
import { WORK_DILEMMAS_PART2B } from "./dilemmasPart2B.ts";

export type { WorkDilemma };
export const WORK_DILEMMAS: WorkDilemma[] = [
  ...WORK_DILEMMAS_PART1,
  ...WORK_DILEMMAS_PART1B,
  ...WORK_DILEMMAS_PART2,
  ...WORK_DILEMMAS_PART2B,
];
