export function monthCells(year: number, monthIndex: number): (string | null)[] {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const offset = (firstWeekday + 6) % 7;
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= count; day += 1) {
    const month = String(monthIndex + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    cells.push(`${year}-${month}-${date}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseBrl(text: string): number | null {
  const clean = text.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!clean) return null;
  const value = Number(clean);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
