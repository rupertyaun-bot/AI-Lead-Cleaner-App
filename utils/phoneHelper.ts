
// A robust regex that matches multiple common Australian phone number formats.
const AUS_PHONE_REGEX = new RegExp([
    // Matches numbers with country code, e.g., +61 412 345 678 or +61 2 9999 8888
    /\+61\s?4\s?\d{2}\s?\d{3}\s?\d{3}/,
    /\+61\s?[2378]\s?\d{4}\s?\d{4}/,
    // Matches numbers in parens, e.g., (02) 9999 8888
    /\(0[2378]\)\s?\d{4}\s?\d{4}/,
    // Matches numbers with leading zero, e.g., 0412 345 678 or 02 9999 8888
    /04\s?\d{2}\s?\d{3}\s?\d{3}/,
    /0[2378]\s?\d{4}\s?\d{4}/,
    // Matches 13xx, 1300, 1800 numbers
    /1[38]00\s?\d{3}\s?\d{3}/,
    /13\s?\d{2}\s?\d{2}/
].map(r => r.source).join('|'), 'g');


/**
 * Cleans a raw phone number string according to HIP rules.
 * @param rawPhone - A string that might be a phone number.
 * @returns A cleaned phone number string or null if invalid.
 */
export const cleanPhoneNumber = (rawPhone: string): string | null => {
    if (!rawPhone) return null;

    // 1. Strip non-digit characters
    let cleaned = rawPhone.replace(/[^\d]/g, '');

    // 2. Handle '61' prefix by replacing it with '0'
    if (cleaned.startsWith('61')) {
        cleaned = '0' + cleaned.substring(2);
    }
    
    // 3. Handle 9-digit mobile numbers that are missing the leading '0'
    if (cleaned.length === 9 && cleaned.startsWith('4')) {
        cleaned = '0' + cleaned;
    }

    // 4. Validate length. Must be >= 9 digits unless it's a special 13xxxx number.
    const is13Number = cleaned.startsWith('13') && cleaned.length === 6;
    if (!is13Number && cleaned.length < 9) {
        return null;
    }

    return cleaned;
};


/**
 * Finds the first valid and clean Australian phone number by searching fields in a specific order.
 * It first checks the dedicated phone field, and only if no number is found, it scans the title and description.
 * @param phoneField - The content of the dedicated phone field.
 * @param title - The content of the title field.
 * @param description - The content of the description field.
 * @returns A cleaned phone number string or null if not found.
 */
export const findAndCleanPhoneNumber = (phoneField: string, title: string, description: string): string | null => {
    // Step 1: Prioritize the dedicated phone field.
    if (phoneField) {
        // First, try a direct clean. This catches unformatted numbers like '412345678'
        const cleanedFromFieldDirectly = cleanPhoneNumber(phoneField);
        if (cleanedFromFieldDirectly) {
            return cleanedFromFieldDirectly;
        }

        // If direct cleaning fails (e.g., field has extra text like "call me on..."), use regex on it.
        const phoneFieldMatches = phoneField.match(AUS_PHONE_REGEX);
        if (phoneFieldMatches) {
            for (const match of phoneFieldMatches) {
                const cleaned = cleanPhoneNumber(match);
                if (cleaned) {
                    return cleaned; // Return the first valid, cleaned number from the phone field
                }
            }
        }
    }

    // Step 2: If no number was found in the phone field, scan title and description as a fallback.
    const fallbackText = `${title} ${description}`;
    const fallbackMatches = fallbackText.match(AUS_PHONE_REGEX);
    if (fallbackMatches) {
        for (const match of fallbackMatches) {
            const cleaned = cleanPhoneNumber(match);
            if (cleaned) {
                return cleaned; // Return the first valid, cleaned number from fallback text
            }
        }
    }

    return null; // No valid number found anywhere.
};
