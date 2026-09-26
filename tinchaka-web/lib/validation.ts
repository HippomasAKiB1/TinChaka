export interface ValidationResult {
  ok: boolean;
  message?: string;
}

export function validateLogin(input: { email?: string; password?: string }): ValidationResult {
  const email = input.email?.trim() || '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Please enter a valid email address' };
  }
  if (!input.password || input.password.length === 0) {
    return { ok: false, message: 'Password is required' };
  }
  return { ok: true };
}

export function validateSignup(input: {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}): ValidationResult {
  const name = input.name?.trim() || '';
  if (!name || name.length === 0) {
    return { ok: false, message: 'Name is required' };
  }

  const email = input.email?.trim() || '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Please enter a valid email address' };
  }

  if (!input.password || input.password.length < 6) {
    return { ok: false, message: 'Password must be at least 6 characters' };
  }

  if (input.role !== 'PASSENGER' && input.role !== 'DRIVER') {
    return { ok: false, message: 'Role must be either Passenger or Driver' };
  }

  return { ok: true };
}
