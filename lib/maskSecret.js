export function maskSecret(value) {
  if (!value) return null;
  const visible = value.slice(0, 6);
  const hiddenLen = Math.max(6, value.length - 6);
  return `${visible}${'•'.repeat(Math.min(hiddenLen, 20))}`;
}
