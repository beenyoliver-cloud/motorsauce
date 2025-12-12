// Search helper functions for fuzzy matching and typo tolerance

/**
 * Calculate Levenshtein distance between two strings (measures edit distance)
 * Used for typo tolerance in search
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Check if search term matches target with typo tolerance
 * Returns true if:
 * - Exact match (case insensitive)
 * - Contains substring
 * - Within 2 character edits (for words >= 5 chars)
 * - Within 1 character edit (for words 3-4 chars)
 */
export function fuzzyMatch(searchTerm: string, target: string): boolean {
  const search = searchTerm.toLowerCase().trim();
  const text = target.toLowerCase().trim();

  // Empty search matches everything
  if (!search) return true;

  // Exact match or contains
  if (text.includes(search)) return true;

  // For short search terms (< 3 chars), only use contains logic
  if (search.length < 3) return false;

  // Split search into words and check each word
  const searchWords = search.split(/\s+/);
  const textWords = text.split(/\s+/);

  // Check if all search words match at least one target word (with typo tolerance)
  return searchWords.every(searchWord => {
    // Direct contains check first
    if (text.includes(searchWord)) return true;

    // Fuzzy match against individual words in target
    return textWords.some(textWord => {
      // Skip very short words for fuzzy matching
      if (textWord.length < 3 || searchWord.length < 3) {
        return textWord.includes(searchWord) || searchWord.includes(textWord);
      }

      const distance = levenshteinDistance(searchWord, textWord);
      
      // Allow more typos for longer words
      if (searchWord.length >= 5) {
        return distance <= 2; // 2 character edits for words 5+ chars
      } else {
        return distance <= 1; // 1 character edit for words 3-4 chars
      }
    });
  });
}

/**
 * Search through listing fields with fuzzy matching
 * Searches: title, description, OEM number, make, model, category, subcategory
 */
export function searchListing(
  listing: {
    title: string;
    description?: string;
    oem?: string;
    make?: string;
    model?: string;
    category?: string;
    part_type?: string;
    main_category?: string;
  },
  searchTerm: string
): boolean {
  if (!searchTerm || !searchTerm.trim()) return true;

  const fieldsToSearch = [
    listing.title,
    listing.description,
    listing.oem,
    listing.make,
    listing.model,
    listing.category,
    listing.part_type,
    listing.main_category,
  ].filter(Boolean) as string[];

  // Check if search term matches any field
  return fieldsToSearch.some(field => fuzzyMatch(searchTerm, field));
}

/**
 * Common typo mappings for car parts
 */
const COMMON_TYPOS: Record<string, string[]> = {
  'alternator': ['alternater', 'alternatr', 'alternater'],
  'brakes': ['breaks', 'braks'],
  'exhaust': ['exaust', 'exhust'],
  'suspension': ['suspention', 'suspenshion'],
  'headlight': ['headlite', 'head light'],
  'intercooler': ['inter cooler', 'intercooler'],
  'turbo': ['turbocharger', 'turbocharger'],
  'clutch': ['cluch', 'clutsch'],
  'gearbox': ['gear box', 'gearbok'],
  'radiator': ['radiater', 'rad'],
  'bumper': ['bumpar', 'bumper'],
  'bonnet': ['bonet', 'hood'],
  'boot': ['trunk', 'tailgate'],
  'tyre': ['tire', 'tires', 'tyres'],
  'alloy': ['alloys', 'rims', 'wheels'],
  'spoiler': ['spoiler', 'wing'],
};

/**
 * Normalize search term by correcting common typos
 */
export function normalizeSearchTerm(searchTerm: string): string {
  const lower = searchTerm.toLowerCase().trim();
  
  // Check if the search term is a known typo
  for (const [correct, typos] of Object.entries(COMMON_TYPOS)) {
    if (typos.includes(lower)) {
      return correct;
    }
  }
  
  return lower;
}

/**
 * Get search suggestions based on partial input
 */
export function getSearchSuggestions(partial: string, allTerms: string[]): string[] {
  const lower = partial.toLowerCase().trim();
  if (!lower || lower.length < 2) return [];

  const suggestions = allTerms
    .filter(term => {
      const termLower = term.toLowerCase();
      return termLower.includes(lower) || fuzzyMatch(lower, termLower);
    })
    .slice(0, 10); // Limit to 10 suggestions

  return suggestions;
}
