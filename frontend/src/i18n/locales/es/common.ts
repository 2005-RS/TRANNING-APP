import { commonCopySource } from '@/i18n/locales/en/common';
import type { LooseCopy } from '@/i18n/live-copy';

export const esCommon: LooseCopy<typeof commonCopySource> = {
  language: {
    label: 'Idioma',
    english: 'English',
    spanish: 'Español',
    code: {
      en: 'EN',
      es: 'ES',
    },
  },
  dates: {
    from: 'Desde {{date}}',
    until: 'Hasta {{date}}',
  },
  duration: {
    seconds: '{{count}} s',
    minutes: '{{count}} min',
    hours: '{{count}} h',
    hoursMinutes: '{{hours}} h {{minutes}} min',
  },
  validation: {
    enterNumber: 'Ingresa un número.',
    range: 'Ingresa un valor entre {{min}} y {{max}}.',
    notesMax: 'Las notas deben tener {{max}} caracteres o menos.',
  },
  errors: {
    checkInput: 'Revisa los datos',
    signInRequired: 'Debes iniciar sesión',
    sessionInvalid: 'Tu sesión no es válida. Vuelve a iniciar sesión para continuar.',
    notAllowed: 'No permitido',
    notAllowedBody: 'No puedes realizar esta acción.',
    notFound: 'No encontrado',
    notFoundBody: 'Este recurso no está disponible.',
    cannotComplete: 'No se puede completar esta acción',
    tooMany: 'Demasiadas solicitudes',
    tooManyBody: 'Espera un momento e inténtalo de nuevo.',
    genericTitle: 'Ocurrió un error',
    genericBody:
      'No se pudo completar la solicitud. Si continúa, comparte el identificador de la solicitud con soporte.',
    genericShort: 'No se pudo completar la solicitud.',
    tryAgain: 'Ocurrió un error. Inténtalo de nuevo.',
  },
  enums: {
    muscle: {
      CHEST: 'Pecho',
      BACK: 'Espalda',
      SHOULDERS: 'Hombros',
      BICEPS: 'Bíceps',
      TRICEPS: 'Tríceps',
      FOREARMS: 'Antebrazos',
      QUADRICEPS: 'Cuádriceps',
      HAMSTRINGS: 'Isquiotibiales',
      GLUTES: 'Glúteos',
      CALVES: 'Pantorrillas',
      CORE: 'Core',
      FULL_BODY: 'Cuerpo completo',
      CARDIO: 'Cardio',
      OTHER: 'Otro',
    },
    equipment: {
      BODYWEIGHT: 'Peso corporal',
      BARBELL: 'Barra',
      DUMBBELL: 'Mancuerna',
      MACHINE: 'Máquina',
      CABLE: 'Polea',
      KETTLEBELL: 'Pesa rusa',
      RESISTANCE_BAND: 'Banda elástica',
      EZ_BAR: 'Barra EZ',
      TRAP_BAR: 'Barra hexagonal',
      CARDIO_MACHINE: 'Máquina de cardio',
      OTHER: 'Otro',
    },
    difficulty: {
      BEGINNER: 'Principiante',
      INTERMEDIATE: 'Intermedio',
      ADVANCED: 'Avanzado',
    },
  },
};
