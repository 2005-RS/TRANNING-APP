export const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) =>
    value === null ? null : Number(value),
};
