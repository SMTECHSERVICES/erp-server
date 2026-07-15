export function parseMonthString(monthStr) {
  if (!monthStr) return null;

  monthStr = monthStr.trim();

  // case 1: YYYY-MM or YYYY/MM
  const isoMatch = monthStr.match(/^(\d{4})[ -\/]?(\d{1,2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    if (year > 1900 && m >= 1 && m <= 12) return { year, monthIndex: m - 1 };
  }

  // case 2: MM-YYYY or MM/YYYY (e.g. 08-2025)
  const revMatch = monthStr.match(/^(\d{1,2})[ -\/]?(\d{4})$/);
  if (revMatch) {
    const m = Number(revMatch[1]);
    const year = Number(revMatch[2]);
    if (year > 1900 && m >= 1 && m <= 12) return { year, monthIndex: m - 1 };
  }

  // case 3: "August 2025" or "Aug 2025" (any case)
  const wordsMatch = monthStr.match(/([A-Za-z]+)\s+(\d{4})/);
  if (wordsMatch) {
    const monthName = wordsMatch[1].toLowerCase();
    const year = Number(wordsMatch[2]);
    const monthNames = [
      "january","february","march","april","may","june",
      "july","august","september","october","november","december"
    ];
    const idx = monthNames.findIndex(m => m.startsWith(monthName));
    if (idx >= 0) return { year, monthIndex: idx };
  }

  // last attempt: Date.parse on first day (may be locale-dependent)
  const tryDate = new Date(monthStr);
  if (!isNaN(tryDate.getTime())) {
    return { year: tryDate.getFullYear(), monthIndex: tryDate.getMonth() };
  }

  return null;
}
