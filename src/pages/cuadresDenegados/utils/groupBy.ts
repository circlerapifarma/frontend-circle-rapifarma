// utils/groupBy.ts
export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const groupKey = String(item[key]);
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey] = [...acc[groupKey], item];
    return acc;
  }, {} as Record<string, T[]>);
}
