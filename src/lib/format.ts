export const fmt = (n: number | string | null | undefined) => {
  let v = Number(n ?? 0);
  if (isNaN(v)) return "Rs. 0";
  v = Math.round(v * 100) / 100;
  const hasDecimals = v % 1 !== 0;
  return "Rs. " + v.toLocaleString("en-IN", { 
    minimumFractionDigits: hasDecimals ? 2 : 0, 
    maximumFractionDigits: 2 
  });
};

export const fmtQty = (n: number | string | null | undefined) => {
  let v = Number(n ?? 0);
  if (isNaN(v)) return "0";
  v = Math.round(v * 1000) / 1000;
  return v.toLocaleString("en-IN", { maximumFractionDigits: 3 });
};
