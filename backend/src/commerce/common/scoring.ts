import { SupplierLabel } from '../../generated/prisma/enums';

export interface ScoredAnswer {
  score: number; // 0..3
  weight: number; // > 0
}

export const MAX_ANSWER_SCORE = 3;

export const round2 = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * امتیاز نهایی (۰ تا ۱۰۰) = مجموع(نمره × وزن) ÷ (حداکثر نمره × مجموع وزن‌ها) × 100
 */
export function calculateTotalScore(answers: ScoredAnswer[]): number {
  const totalWeight = answers.reduce((s, a) => s + a.weight, 0);
  if (totalWeight <= 0) return 0;
  const weighted = answers.reduce((s, a) => s + a.score * a.weight, 0);
  return round2((weighted / (MAX_ANSWER_SCORE * totalWeight)) * 100);
}

/**
 * >= whiteMin → سفید ، >= grayMin → خاکستری ، کمتر → مشکی
 */
export function labelForScore(
  score: number,
  whiteMin = 60,
  grayMin = 40,
): SupplierLabel {
  if (score >= whiteMin) return SupplierLabel.WHITE;
  if (score >= grayMin) return SupplierLabel.GRAY;
  return SupplierLabel.BLACK;
}
