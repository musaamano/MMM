/**
 * validation.js
 * Standardized client-side validation utilities for the application.
 */

// Strict Email Regex (RFC 5322 standard approximation)
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[a-zA-Z0-4.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  return emailRegex.test(email.trim());
};

// Phone Regex Requirements (Allows optional + prefix, spaces, and numbers, 9-15 digits total)
export const isValidPhone = (phone) => {
  if (!phone) return false;
  // strips out spaces, dashes, parentheses to count digits
  const digits = phone.replace(/[\s\-\(\)\+]/g, '');
  if (digits.length < 9 || digits.length > 15) return false;
  
  // Basic validation that it's a structural phone format
  const phoneRegex = /^\+?[0-9\s\-\(\)]+$/;
  return phoneRegex.test(phone.trim());
};

// Password Requirements (Minimum length standard)
export const isStrongPassword = (password, minLength = 6) => {
  if (!password) return false;
  // Currently enforcing length, but in the future could enforce rules like uppercase, numbers, etc.
  return password.length >= minLength;
};

// Ethiopian Plate Number Basic Rules (Could be adjusted based on formats like AA-12345 or Code-3 12345)
export const isValidPlateNumber = (plate) => {
  if (!plate) return false;
  // Checking that it's at least 4 alphanumeric chars minimum
  const stripped = plate.replace(/[\s\-]/g, '');
  return stripped.length >= 4;
};
