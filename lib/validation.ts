// Validation utilities for form inputs

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateRequired(value: string | undefined | null): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, error: 'This field is required' };
  }
  return { isValid: true };
}

export function validateAmount(value: string | number | undefined | null): ValidationResult {
  if (value === undefined || value === null || value === '') {
    return { isValid: false, error: 'Amount is required' };
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }
  
  if (numValue < 0) {
    return { isValid: false, error: 'Amount cannot be negative' };
  }
  
  if (numValue > 1000000000000) {
    return { isValid: false, error: 'Amount is too large' };
  }
  
  return { isValid: true };
}

export function validateDate(value: string | undefined | null, allowFuture: boolean = false): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, error: 'Date is required' };
  }
  
  const date = new Date(value);
  
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Please enter a valid date' };
  }
  
  if (!allowFuture) {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (date > today) {
      return { isValid: false, error: 'Date cannot be in the future' };
    }
  }
  
  return { isValid: true };
}

export function validateInterestRate(value: string | number | undefined | null): ValidationResult {
  if (value === undefined || value === null || value === '') {
    return { isValid: true }; // Interest rate is optional
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }
  
  if (numValue < 0) {
    return { isValid: false, error: 'Interest rate cannot be negative' };
  }
  
  if (numValue > 100) {
    return { isValid: false, error: 'Interest rate cannot exceed 100%' };
  }
  
  return { isValid: true };
}

export function validateName(value: string | undefined | null): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, error: 'Name is required' };
  }
  
  if (value.trim().length < 1) {
    return { isValid: false, error: 'Name cannot be empty' };
  }
  
  if (value.trim().length > 200) {
    return { isValid: false, error: 'Name is too long (max 200 characters)' };
  }
  
  return { isValid: true };
}

