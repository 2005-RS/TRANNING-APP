import { clientSubscriptionCopySource } from '@/features/client-subscription/copy';
import type { LooseCopy } from '@/i18n/live-copy';

export const esClientSubscription: LooseCopy<typeof clientSubscriptionCopySource> = {
  title: 'Mi plan', free: 'Gratis', pro: 'Pro', complimentary: 'Pro (cortesía)', until: 'Pro hasta {{date}}',
  freeMeaning: 'Entrena con rutinas listas y lleva tu progreso por tu cuenta.',
  proMeaning: 'Tu entrenador te acompaña con un plan hecho para ti.',
  benefits: 'Pro incluye un entrenador, planes personalizados y revisiones de seguimientos.', renew: 'Renovar', instructions: 'Instrucciones SINPE Móvil',
  unavailable: 'Los pagos aún no están habilitados. Escríbenos para activar Pro.', pending: 'Pago en verificación',
  rejected: 'Pago rechazado: {{reason}}', report: 'Ya pagué: reportar pago', reference: 'Número de comprobante', paidOn: 'Fecha de pago',
  payerPhone: 'Teléfono del pagador (opcional)', submit: 'Reportar pago', reporting: 'Reportando...', copyPhone: 'Copiar teléfono',
  stepOne: 'Abre la aplicación de tu banco.', stepTwo: 'Envía un SINPE Móvil con estos datos:',
  stepThree: 'Reporta aquí el número de comprobante.', tooMany: 'Demasiados intentos. Inténtalo más tarde.',
  invalid: 'Revisa los datos del pago e inténtalo de nuevo.', pendingConflict: 'Ya tienes un pago en verificación.',
  unavailableError: 'Los pagos no están configurados en este momento.',
  referenceUsed: 'Este número de comprobante ya fue usado.',
  invalidDate: 'Elige una fecha de pago de los últimos 30 días.',
  offline: 'No se puede conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  referenceRequired: 'Ingresa el número de comprobante.',
  referenceLength: 'Usa como máximo 40 caracteres.',
  payerPhoneInvalid: 'Ingresa un teléfono de 8 dígitos.',
  comparisonTitle: 'Gratis vs Pro', freePlan: 'Gratis', proPlan: 'Pro', includes: 'Tu plan incluye',
  freeFeatures: ['Biblioteca de rutinas', 'Registro de entrenamientos', 'Progreso y medidas', 'Diario de comidas', 'Asistente'],
  proFeatures: ['Todo lo de Gratis', 'Entrenador asignado', 'Plan de entrenamiento y nutrición a tu medida', 'Revisión de check-ins'],
  paymentTimeline: 'Estado del pago', reported: 'Reportado', reviewing: 'En verificación', active: 'Activo',
  rejectedStatus: 'Rechazado', referenceDate: '{{reference}} · {{date}}', phone: 'Número de teléfono', holder: 'Titular', amount: 'Monto',
};
