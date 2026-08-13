import type { CSSProperties } from 'react';

const HEX_COLOR = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const normalizeTagColor = (value: string | null | undefined): string | null => {
  const raw = value?.trim();
  if (!raw) return null;
  const match = raw.match(HEX_COLOR);
  if (!match) return null;
  const hex = match[1].length === 3
    ? match[1].split('').map((character) => character + character).join('')
    : match[1];
  return `#${hex.toLowerCase()}`;
};

export const getTagColorStyle = (value: string | null | undefined): CSSProperties => {
  const color = normalizeTagColor(value);
  if (!color) return {};
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  const textColor = luminance > 0.62
    ? `rgb(${Math.round(red * 0.48)} ${Math.round(green * 0.48)} ${Math.round(blue * 0.48)})`
    : color;
  return {
    color: textColor,
    backgroundColor: `rgb(${red} ${green} ${blue} / 0.11)`,
    borderColor: `rgb(${red} ${green} ${blue} / 0.28)`,
  };
};
