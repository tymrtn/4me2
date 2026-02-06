const CID_REGEX = /1s0x0:0x([a-f0-9]+)/;

/**
 * Extract a Google CID from a Maps URL.
 * URL format: https://www.google.com/maps/place//data=!4m2!3m1!1s0x0:0x{CID}
 * Returns the CID as "0x{hex}" or null if not found.
 */
export function extractCid(googleMapsUrl: string): string | null {
  const match = googleMapsUrl.match(CID_REGEX);
  if (!match) return null;
  return `0x${match[1]}`;
}
