export const fmt = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  const hasDecimals = v % 1 !== 0;
  return "Rs. " + v.toLocaleString("en-IN", { 
    minimumFractionDigits: hasDecimals ? 2 : 0, 
    maximumFractionDigits: 2 
  });
};

export const fmtQty = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-IN", { maximumFractionDigits: 3 });
};
