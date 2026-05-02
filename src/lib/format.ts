export const fmt = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return "Rs. " + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const fmtQty = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-IN", { maximumFractionDigits: 3 });
};
