export function formatVolume(vol: number): string {
  return `${Math.round(vol).toLocaleString("it-IT")} kg`;
}
