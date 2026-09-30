import { passwordResetCopySource } from '@/features/password-reset/copy';
import type { LooseCopy } from '@/i18n/live-copy';

export const esPasswordReset: LooseCopy<typeof passwordResetCopySource> = {
  forgotLink: '¿Olvidaste tu contraseña?',
  backToSignIn: 'Volver a iniciar sesión',
  forgot: {
    title: 'Restablece tu contraseña',
    subtitle: 'Escribe el correo con el que inicias sesión. Te enviaremos un enlace para elegir una contraseña nueva.',
    emailLabel: 'Correo electrónico',
    submit: 'Enviar enlace',
    submitting: 'Enviando',
    sentTitle: 'Revisa tu correo',
    sentBody: (email: string) =>
      `Si existe una cuenta para ${email}, el enlace ya va en camino. Funciona una sola vez y caduca en 30 minutos.`,
    sendAnother: 'Usar otro correo',
  },
  reset: {
    title: 'Elige una contraseña nueva',
    subtitle: 'Tendrás que volver a iniciar sesión en todos tus dispositivos.',
    passwordLabel: 'Contraseña nueva',
    confirmLabel: 'Confirma la contraseña nueva',
    passwordHint: 'Mínimo 12 caracteres.',
    submit: 'Guardar contraseña',
    submitting: 'Guardando',
    doneTitle: 'Contraseña actualizada',
    doneBody: 'Cambiamos tu contraseña y cerramos todas las sesiones. Inicia sesión con la contraseña nueva.',
    signIn: 'Iniciar sesión',
    invalidTitle: 'Este enlace no se puede usar',
    invalidBody: 'Los enlaces funcionan una sola vez y caducan a los 30 minutos. Pide uno nuevo para continuar.',
    requestNew: 'Pedir un enlace nuevo',
  },
  validation: {
    emailRequired: 'Escribe tu correo',
    emailInvalid: 'Escribe un correo válido',
    passwordLength: 'Usa entre 12 y 128 caracteres.',
    passwordMismatch: 'Las contraseñas no coinciden.',
  },
  errors: {
    rateLimited: 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.',
    network: 'No hay conexión. Revisa tu red y vuelve a intentarlo.',
    generic: 'Algo salió mal. Inténtalo de nuevo en un momento.',
  },
};
