import { clientProfileCopySource } from '@/features/client-profile/copy';
import type { LooseCopy } from '@/i18n/live-copy';

export const esClientProfile: LooseCopy<typeof clientProfileCopySource> = {
  title: 'Mi perfil',
  description: 'Revisa tu cuenta y actualiza tus preferencias de entrenamiento.',
  account: 'Cuenta',
  name: 'Nombre',
  email: 'Correo electrónico',
  emailHint: 'Para cambiar tu correo escribe a soporte.',
  phone: 'Teléfono',
  primaryGoal: 'Objetivo principal',
  experienceLevel: 'Nivel de experiencia',
  goalNotes: 'Notas sobre tu objetivo',
  goalNotesHint: 'Detalles opcionales para orientar tu entrenamiento.',
  save: 'Guardar cambios',
  saving: 'Guardando cambios',
  saved: 'Perfil actualizado.',
  saveError: 'No pudimos guardar tu perfil. Inténtalo de nuevo.',
  phoneInvalid: 'Usa solo números y símbolos de teléfono (+, -, espacios).',
  selectRequired: 'Elige una opción.',
  preferences: 'Preferencias de entrenamiento',
  security: 'Seguridad',
  retry: 'Reintentar',
  changePassword: 'Cambiar contraseña',
  changePasswordHint: 'Te enviaremos un enlace a tu correo.',
  logout: 'Cerrar sesión',
};
