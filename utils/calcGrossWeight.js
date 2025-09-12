/**
 * Calculate Gross Weight of a single part (Pipe or Round Bar).
 * All sizes in mm, density in g/cm^3.
 * Returns gross weight in kg.
 */
export function calcGrossWeight({ type, od, id = 0, length, density = 7.86 }) {
  let area_mm2;

  if (type === "Pipe") {
    // Hollow section: Area = π/4 * (OD² - ID²)
    area_mm2 = Math.PI * (Math.pow(od, 2) - Math.pow(id, 2)) / 4;
  } else if (type === "Round Bar") {
    // Solid section: Area = π/4 * (OD²)
    area_mm2 = Math.PI * Math.pow(od, 2) / 4;
  } else {
    throw new Error("Invalid type. Must be 'Pipe' or 'RoundBar'.");
  }

  const vol_mm3 = area_mm2 * length;         // mm³
  const vol_cm3 = vol_mm3 / 1000;            // cm³
  const grossWeightKg = (vol_cm3 * density) / 1000; // kg

  return +grossWeightKg.toFixed(3); // return rounded kg
}

// -------------------- Example Usage --------------------

// Pipe
// const pipeGross = calcGrossWeight({
//   type: "Pipe",
//   od: 42.3,
//   id: 27,
//   length: 65.5,
//   density: 7.86
// });
// console.log("Pipe Gross Weight (kg):", pipeGross);

// Round Bar
// const barGross = calcGrossWeight({
//   type: "RoundBar",
//   od: 42.3,
//   length: 65.5,
//   density: 7.86
// });
// console.log("Round Bar Gross Weight (kg):", barGross);
