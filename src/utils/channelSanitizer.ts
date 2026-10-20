// Channel Name Sanitizer ported and adapted from IPTVnator's title-normalization.util
// Strips provider country/language tags (e.g. "US - ", "UK | ", "IN: ") and quality suffixes.

const PROVIDER_SEPARATORS = '[|\\-:]';

// Leading 2-5 letter country/language/provider tag: "US - ", "UK | ", "IN: ", "4K-DE | "
const PREFIX_REGEX = new RegExp(
  `^\\s*(?:[|]?[A-Z0-9+]{2,5}(?:-[A-Z0-9+]{2,5})?[|]?)\\s*${PROVIDER_SEPARATORS}\\s*`,
  ''
);

// Bracketed tags at the start: "[US] ", "|FR| ", "(UK) "
const BRACKETED_PREFIX_REGEX = /^\s*(?:\[[A-Z0-9+]{2,6}\]|\([A-Z0-9+]{2,6}\)|\|[A-Z0-9+]{2,6}\|)\s*/;

// Trailing resolution tags: " (FHD)", " [4K]", " [HEVC]", " HD"
const RESOLUTION_SUFFIX_REGEX = /\s*(?:\[|\()?(\b(?:4K|UHD|FHD|HD|SD|HEVC|H\.?264|H\.?265|RAW|1080p|720p|50fps|60fps)\b)(?:\]|\))?\s*$/i;

export class ChannelSanitizer {
  /**
   * Cleans country prefixes and bracketed noise from a channel or VOD title.
   * Example: "US - HBO HD" -> "HBO"
   * Example: "IN | Star Sports 1 [FHD]" -> "Star Sports 1"
   */
  static cleanTitle(rawName: string): string {
    if (!rawName) return '';

    let cleaned = rawName.trim();

    // 1. Strip bracketed prefix: "[US] Discovery" -> "Discovery"
    cleaned = cleaned.replace(BRACKETED_PREFIX_REGEX, '');

    // 2. Strip separator prefix: "UK | Sky Cinema" -> "Sky Cinema"
    cleaned = cleaned.replace(PREFIX_REGEX, '');

    // 3. Strip trailing resolution/codec tags: "CNN News HD" -> "CNN News"
    cleaned = cleaned.replace(RESOLUTION_SUFFIX_REGEX, '');

    // 4. Clean extra spaces
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

    // If stripping resulted in empty or pure symbols, fallback to original name
    return cleaned.length > 1 ? cleaned : rawName;
  }
}

export const cleanTitle = ChannelSanitizer.cleanTitle;

