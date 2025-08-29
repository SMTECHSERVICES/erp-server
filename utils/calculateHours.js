export const calculateHours = (inTime, outTime) => {
  const inDate = new Date(inTime);
  const outDate = new Date(outTime);

  // Calculate difference in milliseconds
  const diffMs = outDate - inDate;

  // Convert milliseconds to hours (with decimals)
  const diffHours = diffMs / (1000 * 60 * 60);

  // Optional: Round to 2 decimal places
  return Math.round(diffHours * 100) / 100;
};
