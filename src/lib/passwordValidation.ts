// src/lib/passwordValidation.ts

export interface PasswordStrength {
  isValid: boolean;
  score: number; // 0-5
  errors: string[];
  suggestions: string[];
}

/**
 * Validates password strength according to security requirements
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
 */
export function validatePasswordStrength(password: string): PasswordStrength {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  } else {
    score++;
    if (password.length >= 12) {
      score++; // Bonus for longer passwords
    }
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
    suggestions.push("Add an uppercase letter (A-Z)");
  } else {
    score++;
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
    suggestions.push("Add a lowercase letter (a-z)");
  } else {
    score++;
  }

  // Check for numbers
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
    suggestions.push("Add a number (0-9)");
  } else {
    score++;
  }

  // Check for special characters
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&* etc.)");
    suggestions.push("Add a special character (!@#$%^&*)");
  } else {
    score++;
  }

  // Check for common weak passwords
  const commonPasswords = [
    "password", "12345678", "qwerty123", "abc123456", "password1",
    "welcome1", "letmein1", "admin123", "password123", "qwerty1234"
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("This password is too common and easily guessed");
    score = Math.max(0, score - 2);
  }

  // Check for sequential characters
  if (/(?:abc|bcd|cde|def|efg|fgh|123|234|345|456|567|678|789)/i.test(password)) {
    suggestions.push("Avoid sequential characters (abc, 123, etc.)");
    score = Math.max(0, score - 1);
  }

  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    suggestions.push("Avoid repeated characters (aaa, 111, etc.)");
  }

  return {
    isValid: errors.length === 0,
    score: Math.min(5, score),
    errors,
    suggestions,
  };
}

/**
 * Get a human-readable strength label
 */
export function getPasswordStrengthLabel(score: number): string {
  if (score <= 1) return "Very Weak";
  if (score === 2) return "Weak";
  if (score === 3) return "Fair";
  if (score === 4) return "Strong";
  return "Very Strong";
}

/**
 * Get color class for password strength indicator
 */
export function getPasswordStrengthColor(score: number): string {
  if (score <= 1) return "bg-red-500";
  if (score === 2) return "bg-orange-500";
  if (score === 3) return "bg-yellow-500";
  if (score === 4) return "bg-blue-500";
  return "bg-green-500";
}
