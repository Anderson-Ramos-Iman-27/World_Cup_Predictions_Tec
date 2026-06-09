export type PasswordRule = {
  label: string;
  isValid: boolean;
};

export function getPasswordRules(password: string): PasswordRule[] {
  return [
    {
      label: 'Minimo 8 caracteres',
      isValid: password.length >= 8,
    },
    {
      label: 'Una letra mayuscula',
      isValid: /[A-Z]/.test(password),
    },
    {
      label: 'Una letra minuscula',
      isValid: /[a-z]/.test(password),
    },
    {
      label: 'Un numero',
      isValid: /\d/.test(password),
    },
    {
      label: 'Un caracter especial',
      isValid: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

export function isStrongPassword(password: string) {
  return getPasswordRules(password).every((rule) => rule.isValid);
}

export function getPasswordStrengthLabel(password: string) {
  const validRules = getPasswordRules(password).filter((rule) => rule.isValid).length;

  if (validRules <= 2) {
    return 'Debil';
  }

  if (validRules <= 4) {
    return 'Media';
  }

  return 'Segura';
}
