import { authCopySource } from '@/features/auth/copy';
import type { LooseCopy } from '@/i18n/live-copy';

export const esAuth: LooseCopy<typeof authCopySource> = {
  productName: 'Training Platform',
  brandSlotLabel: 'Training Platform',
  backToSite: 'Training Platform — volver al sitio web',
  boot: {
    status: 'Restaurando tu sesión',
  },
  restore: {
    title: 'No se pudo restaurar tu sesión.',
    body: 'Revisa tu conexión e inténtalo de nuevo.',
    retry: 'Reintentar',
    retrying: 'Reintentando',
    goToSignIn: 'Ir a iniciar sesión',
  },
  hero: {
    eyebrow: 'Espacio de entrenamiento',
    title: 'Entrena con precisión.',
    body: 'Planes, sesiones y progreso en una superficie clara para entrenadores y atletas.',
    footer: 'Entrenamiento privado, con sesión iniciada.',
  },
  login: {
    mobileEyebrow: 'Training Platform',
    title: 'Iniciar sesión',
    subtitle: 'Usa la cuenta que creó tu entrenador o administrador.',
    emailLabel: 'Correo electrónico',
    passwordLabel: 'Contraseña',
    submit: 'Iniciar sesión',
    submitting: 'Iniciando sesión',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
  },
  validation: {
    emailRequired: 'Ingresa tu correo electrónico',
    emailInvalid: 'Ingresa un correo válido',
    passwordRequired: 'Ingresa tu contraseña',
  },
  errors: {
    invalidCredentials: 'El correo o la contraseña no son correctos.',
    rateLimited: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
    network: 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.',
    server: 'Ocurrió un error. Inténtalo de nuevo en un momento.',
    generic: 'No se puede iniciar sesión ahora. Inténtalo de nuevo.',
    supportHint: 'Referencia de soporte',
  },
  session: {
    temporaryNote: 'Sesión iniciada.',
    signedInAs: 'Sesión iniciada',
    role: 'Rol',
    logout: 'Cerrar sesión',
    logoutAll: 'Cerrar sesión en todos lados',
    signingOut: 'Cerrando sesión',
    signedOut: 'Sesión cerrada',
    signedOutAll: 'Sesión cerrada en todos lados',
  },
  theme: {
    cycle: 'Apariencia',
  },
};
