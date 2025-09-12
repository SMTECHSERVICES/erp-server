/**
 * Calculate raw material requirement for a tubular part (pipe/hollow).
 * All sizes in mm, density in g/cm^3. Returns weight, length, and cost.
 */
export function calcPipeRm({ od, id, length, qty, density = 7.86, scrapPercent = 0, rate = 0 }) {
  const area_mm2 = Math.PI * (od ** 2 - id ** 2) / 4;   // mm²
  const vol_mm3 = area_mm2 * length;                    // mm³
  const vol_cm3 = vol_mm3 / 1000;                       // cm³
  const wtPerPcKg = (vol_cm3 * density) / 1000;         // kg
  const wtPerPcGrossKg = wtPerPcKg * (1 + scrapPercent / 100);
  const totalKg = wtPerPcGrossKg * qty;

  // Cost calculation
  const totalCost = totalKg * rate;

  // Equivalent tube length if bought as raw pipe
  const totalLength_m = (totalKg * 1_000_000) / (density * area_mm2);

  return {
    wtPerPcKg: +wtPerPcKg.toFixed(6),
    wtPerPcGrossKg: +wtPerPcGrossKg.toFixed(6),
    totalKg: +totalKg.toFixed(3),
    totalCost: +totalCost.toFixed(2),
  };
}

/**
 * Calculate raw material requirement for a solid round bar.
 * No ID, only OD + length + qty. Density default 7.65 g/cm³.
 */
export function calcRoundBarRM({ od, length, qty, density = 7.86, scrapPercent = 0, rate = 0 }) {
  const area_mm2 = Math.PI * (od ** 2) / 4;             // mm²
  const vol_mm3 = area_mm2 * length;                    // mm³
  const vol_cm3 = vol_mm3 / 1000;                       // cm³
  const wtPerPcKg = (vol_cm3 * density) / 1000;         // kg
  const wtPerPcGrossKg = wtPerPcKg * (1 + scrapPercent / 100);
  const totalKg = wtPerPcGrossKg * qty;

  // Cost calculation
  const totalCost = totalKg * rate;

  // Equivalent length if purchased as bar
  const totalLength_m = (totalKg * 1_000_000) / (density * area_mm2);

  return {
    wtPerPcKg: +wtPerPcKg.toFixed(6),
    wtPerPcGrossKg: +wtPerPcGrossKg.toFixed(6),
    totalKg: +totalKg.toFixed(3),
    
    totalCost: +totalCost.toFixed(2),
  };
}

// -------------------- Example Usage --------------------

// Tube Example (OD, ID, Length, Qty, Rate)
// const tubeRes = calcTubeRM({ 
//   od: 42.3, 
//   id: 27, 
//   length: 65.5, 
//   qty: 250, 
//   density: 7.86, 
//   scrapPercent: 0, 
//   rate: 29.81 
// });
// console.log("Tube Result:", tubeRes);

// // Round Bar Example (OD, Length, Qty, Rate)
// const barRes = calcRoundBarRM({
//   od: 42.3,
//   length: 65.5,
//   qty: 250,
//   density: 7.65,
//   scrapPercent: 0,
//   rate: 29.81
// });
// console.log("Round Bar Result:", barRes);
