const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email ou mot de passe incorrect',
  user_already_exists: 'Un compte existe déjà avec cet email',
  weak_password: 'Mot de passe trop faible (6 caractères minimum)',
  email_not_confirmed: 'Confirmez votre email avant de vous connecter',
  over_email_send_rate_limit: 'Trop de demandes, réessayez dans quelques minutes',
  validation_failed: 'Vérifiez l’email saisi',
}

export function authErrorMessage(error: { code?: string; message?: string }): string {
  return (error.code && MESSAGES[error.code]) || 'Une erreur est survenue, réessayez'
}
