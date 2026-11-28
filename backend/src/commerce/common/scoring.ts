import { SupplierLabel } from '../../generated/prisma/enums';

export const MAX_ANSWER_SCORE = 3;

export function computeScore(answers: { score: number; weight: number }[]): number {
  const totalWeight = answers.reduce((s, a) => s + a.weight, 0);
  if (totalWeight <= 0) return 0;
  const earned = answers.reduce((s, a) => s + a.score * a.weight, 0);
  const pct = (earned / (MAX_ANSWER_SCORE * totalWeight)) * 100;
  return Math.round((pct + Number.EPSILON) * 100) / 100;
}

/** score >= whiteMin → WHITE ; score >= grayMin → GRAY ; otherwise BLACK */
export function labelForScore(score: number, setting: { whiteMin: number; grayMin: number }): SupplierLabel {
  if (score >= setting.whiteMin) return SupplierLabel.WHITE;
  if (score >= setting.grayMin) return SupplierLabel.GRAY;
  return SupplierLabel.BLACK;
}
