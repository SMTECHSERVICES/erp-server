// utils/calculateDistance.js
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
 // console.log(lat1,lon1,lat2,lon2)
  const toRad = (value) => (value * Math.PI) / 180;

  const R = 6371000; // Radius of Earth in meters
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};
