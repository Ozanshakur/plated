/**
 * Utility to detect potentially sensitive information in text
 */

// Regular expressions for different types of sensitive data
const PATTERNS = {
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // Phone numbers (various formats)
  phone: /(?:\+\d{1,3}[\s-]?)?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,4}(?:[\s.-]?\d{1,4})?/g,

  // German IBAN (simplified)
  iban: /DE\d{2}[ ]?(?:\d{4}[ ]?){4}\d{2}/gi,

  // Credit card numbers
  creditCard: /(?:\d{4}[ -]?){3}\d{4}/g,

  // German postal codes with city
  address: /\b\d{5}\s+[A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß\s-]+\b/g,

  // German ID card number (Personalausweis)
  idCard: /[A-Z]{2}[A-Z0-9]{7}[0-9]/g,

  // German tax ID (Steuer-ID)
  taxId: /\b\d{3}\/\d{3}\/\d{5}\b|\b\d{11}\b/g,

  // Social security number (Sozialversicherungsnummer)
  socialSecurity: /\b[A-Z]{1,2}\d{8,11}\b/g,
}

export type SensitiveDataType = keyof typeof PATTERNS

export interface DetectedSensitiveData {
  type: SensitiveDataType
  value: string
}

/**
 * Detects sensitive data in the provided text
 * @param text The text to check for sensitive data
 * @returns Array of detected sensitive data items or null if none found
 */
export function detectSensitiveData(text: string): DetectedSensitiveData[] | null {
  if (!text || typeof text !== "string") return null

  const detected: DetectedSensitiveData[] = []

  // Check each pattern
  Object.entries(PATTERNS).forEach(([type, pattern]) => {
    const matches = text.match(pattern)
    if (matches) {
      matches.forEach((value) => {
        detected.push({
          type: type as SensitiveDataType,
          value,
        })
      })
    }
  })

  return detected.length > 0 ? detected : null
}

/**
 * Gets a user-friendly name for a sensitive data type
 * @param type The sensitive data type
 * @returns A user-friendly name in German
 */
export function getSensitiveDataTypeName(type: SensitiveDataType): string {
  const typeNames: Record<SensitiveDataType, string> = {
    email: "E-Mail-Adresse",
    phone: "Telefonnummer",
    iban: "Bankverbindung (IBAN)",
    creditCard: "Kreditkartennummer",
    address: "Adresse",
    idCard: "Personalausweisnummer",
    taxId: "Steuer-ID",
    socialSecurity: "Sozialversicherungsnummer",
  }

  return typeNames[type] || "Sensible Daten"
}
