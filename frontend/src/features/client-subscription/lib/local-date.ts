function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function today(date = new Date()): string {
  return toLocalDateInputValue(date);
}

export function minDate(date = new Date()): string {
  const minimum = new Date(date);
  minimum.setDate(minimum.getDate() - 30);
  return toLocalDateInputValue(minimum);
}
