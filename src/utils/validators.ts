export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPakistaniPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('92')) {
    return cleaned.length >= 11 && cleaned.length <= 13;
  }
  if (cleaned.startsWith('0')) {
    return cleaned.length >= 10 && cleaned.length <= 11;
  }
  return cleaned.length >= 10 && cleaned.length <= 13;
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

export const getPasswordStrength = (
  password: string
): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: '#FF4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#FF8C00' };
  if (score <= 3) return { score, label: 'Good', color: '#52B788' };
  return { score, label: 'Strong', color: '#2D6A4F' };
};
