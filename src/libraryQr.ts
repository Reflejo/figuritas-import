import QRCode from "qrcode";
import { gzip } from "pako";
import { CATALOG_CODES } from "./catalogCodes";

type Bit = 0 | 1;

type ParsedCodes = {
  rawCodes: string[];
  uniqueCodes: string[];
};

export type LibraryQrPayload = {
  payload: string;
  needCount: number;
  dupesCount: number;
};

const toBase64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));

export const bitsToBytes = (bits: readonly Bit[]): Uint8Array => {
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));

  bits.forEach((bit, index) => {
    bytes[index >> 3] |= bit << (index & 7);
  });

  return bytes;
};

const normalizeStickerCode = (code: string): string =>
  code.replace(/\s+/g, "").trim();

const parseLine = (line: string): string[] => {
  const cleaned = line
    .replace(/^\s*\[[^\]]+\]\s*/, "")
    .replace(/^\p{Regional_Indicator}{2}\s*/u, "")
    .trim();
  if (!cleaned) {
    return [];
  }

  const directCodes = cleaned.match(/[A-Za-z][A-Za-z0-9-]*\d+/g);
  if (
    directCodes &&
    !cleaned.includes(":") &&
    !/\b\d+\b/.test(cleaned.replace(/[A-Za-z][A-Za-z0-9-]*\d+/g, ""))
  ) {
    return directCodes.map(normalizeStickerCode);
  }

  const parts = cleaned.split(":");
  const left = parts[0]?.trim() ?? "";
  const right = parts.slice(1).join(":").trim();
  const source = parts.length > 1 ? right : cleaned.slice(left.length).trim();
  const country = left.split(/\s+/)[0]?.trim() ?? "";
  if (!country) {
    return [];
  }

  const numbers = source.match(/\d+/g) ?? [];
  return numbers.map((number) =>
    normalizeStickerCode(`${country}${Number(number)}`),
  );
};

const parseCodes = (text: string): ParsedCodes => {
  const rawCodes = text.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    return trimmed ? parseLine(trimmed) : [];
  });

  return {
    rawCodes,
    uniqueCodes: [...new Set(rawCodes)],
  };
};

const maskFor = (codes: string[]): Bit[] => {
  const codeSet = new Set(codes);
  return CATALOG_CODES.map((code) => (codeSet.has(code) ? 1 : 0));
};

const encodeMask = (bits: Bit[]): string => {
  const bytes = bitsToBytes(bits);
  return toBase64(gzip(bytes));
};

export const buildLibraryQrPayload = (
  needText: string,
  dupesText: string,
): LibraryQrPayload => {
  const need = parseCodes(needText);
  const dupes = parseCodes(dupesText);
  const dupesSet = new Set(dupes.uniqueCodes);
  const overlap = need.uniqueCodes.filter((code) => dupesSet.has(code));

  if (overlap.length > 0) {
    throw new Error(`Some dupes are also needs: ${overlap.join(", ")}`);
  }

  const payload =
    "⋋^" +
    `${encodeMask(maskFor(need.uniqueCodes))};` +
    `${encodeMask(maskFor(dupes.uniqueCodes))};` +
    `${toBase64(gzip(new Uint8Array(dupes.rawCodes.length).fill(2)))}`;

  return {
    payload,
    needCount: need.rawCodes.length,
    dupesCount: dupes.rawCodes.length,
  };
};

export const createLibraryQrDataUrl = async (
  needText: string,
  dupesText: string,
): Promise<string> => {
  const { payload } = buildLibraryQrPayload(needText, dupesText);
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "L",
    margin: 2,
  });
};
