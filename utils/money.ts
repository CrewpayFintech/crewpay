export const nairaSymbol = '\u20a6';

export function parseMoneyAmount(value: string) {
  const parsed = Number(value.replace(/,/g, ''));

  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMoneyInput(value: string) {
  const cleanValue = value.replace(/,/g, '');

  if (!cleanValue) {
    return '0';
  }

  const [wholePart = '0', decimalPart] = cleanValue.split('.');
  const whole = wholePart.replace(/^0+(?=\d)/, '') || '0';
  const formattedWhole = Number(whole).toLocaleString('en-NG');

  if (decimalPart === undefined) {
    return formattedWhole;
  }

  return `${formattedWhole}.${decimalPart}`;
}

export function formatNaira(value: number) {
  return value.toLocaleString('en-NG', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export function formatNairaWhole(value: number) {
  return Math.trunc(value).toLocaleString('en-NG');
}
