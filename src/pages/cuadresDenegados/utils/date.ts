// utils/date.ts
export const getCurrentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const toISO = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD

  return {
    inicio: toISO(firstDay),
    fin: toISO(lastDay),
  };
};
