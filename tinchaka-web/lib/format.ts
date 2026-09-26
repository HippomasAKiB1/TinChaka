// Format poysha to formatted Taka string without dropping fractional poysha
export function formatPoysha(p: number): string {
  const taka = p / 100;
  if (p % 100 === 0) {
    return `৳${taka}`;
  }
  return `৳${taka.toFixed(2)}`;
}
