// UK women's sizes with body measurements in inches.
export const SIZES = [
  { uk: 6, us: 2, bust: 31, waist: 24, hip: 34 },
  { uk: 8, us: 4, bust: 33, waist: 26, hip: 36 },
  { uk: 10, us: 6, bust: 35, waist: 28, hip: 38 },
  { uk: 12, us: 8, bust: 37, waist: 30, hip: 40 },
  { uk: 14, us: 10, bust: 39, waist: 32, hip: 42 },
  { uk: 16, us: 12, bust: 41, waist: 34, hip: 44 },
  { uk: 18, us: 14, bust: 43.5, waist: 36.5, hip: 46.5 },
  { uk: 20, us: 16, bust: 46, waist: 39, hip: 49 },
  { uk: 22, us: 18, bust: 48.5, waist: 41.5, hip: 51.5 },
  { uk: 24, us: 20, bust: 51, waist: 44, hip: 54 },
  { uk: 26, us: 22, bust: 53.5, waist: 46.5, hip: 56.5 },
]

export const sizeByUk = (uk) => SIZES.find((s) => s.uk === uk) || SIZES[4]

/** Recommend the smallest size whose bust, waist and hip all fit the given measurements. */
export function recommendSize({ bust, waist, hip }) {
  const fits = SIZES.find(
    (s) => (!bust || s.bust >= bust - 0.5) && (!waist || s.waist >= waist - 0.5) && (!hip || s.hip >= hip - 0.5),
  )
  return fits || SIZES[SIZES.length - 1]
}
