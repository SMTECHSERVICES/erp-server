export const calculatePcs = (rawWeight,grossWeight)=>{
    let ans = Math.floor(parseFloat(rawWeight)/parseFloat(grossWeight));
    return ans
}