const BLOCK_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  {
    regex: /\b(whats?app|telegram|signal|wechat|snapchat|imo|facebook messenger|fb messenger)\b/i,
    reason: "For your safety, please keep the conversation inside Motorsource.",
  },
  {
    regex: /\b(bank\s*transfer|wire\s*transfer|western\s*union|moneygram|crypto|bitcoin|usdt|cashapp|friends\s+and\s+family)\b/i,
    reason: "Please avoid arranging off-platform payments. Use Motorsource to stay protected.",
  },
  {
    regex: /\b(send|pay|transfer)\b.*\bdeposit\b/i,
    reason: "Deposits outside Motorsource are not protected. Keep payments on-platform.",
  },
  {
    regex: /\b((?:\+?\d{1,3})?[-.\s]?\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4})\b.*\b(whats?app|telegram|call|text)\b/i,
    reason: "Sharing personal phone numbers breaks marketplace safety rules. Use in-app messaging.",
  },
];

const WARN_PATTERNS: Array<{ regex: RegExp; warning: string }> = [
  {
    regex: /\bemail\b|\b@\w+\.\w+/i,
    warning: "Avoid sharing email addresses until you trust the other party.",
  },
  {
    regex: /\bmeet\b.*\bcash\b/i,
    warning: "If meeting in person, use public locations and confirm parts before paying.",
  },
  {
    regex: /\bshipping\b.*\blabel\b/i,
    warning: "Be cautious with third-party shipping labels. Use trusted carriers only.",
  },
];

export type MessageSafetyInsights = {
  blockReason: string | null;
  warnings: string[];
};

export function analyzeMessageSafety(text: string | undefined | null): MessageSafetyInsights {
  const result: MessageSafetyInsights = { blockReason: null, warnings: [] };
  if (!text) return result;

  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.regex.test(text)) {
      result.blockReason = pattern.reason;
      break;
    }
  }

  for (const warn of WARN_PATTERNS) {
    if (warn.regex.test(text)) {
      result.warnings.push(warn.warning);
    }
  }

  return result;
}
