import { trainingAssistantCopySource } from '@/features/training-assistant/copy';
import type { LooseCopy } from '@/i18n/live-copy';

export const esTrainingAssistant: LooseCopy<typeof trainingAssistantCopySource> = {
  name: 'Training Assistant',
  launcherLabel: 'Abrir Training Assistant',
  closeLabel: 'Cerrar Training Assistant',
  description:
    'Pregunta cómo funciona la plataforma. Las respuestas las genera una IA y pueden contener errores.',
  greeting:
    '¡Hola! 👋 Soy Training Assistant. Puedo ayudarte a entender tus entrenamientos, nutrición, progreso y cómo funciona la plataforma. ¿En qué te puedo ayudar?',
  quickPromptsLabel: 'Preguntas sugeridas',
  quickPrompts: {
    howItWorks: '¿Cómo funciona?',
    training: 'Entrenamiento',
    nutrition: 'Nutrición',
    progress: 'Progreso',
    help: 'Necesito ayuda',
  },
  public: {
    description:
      'Pregunta qué hace la plataforma. No compartas datos personales ni de salud aquí. Las respuestas las genera una IA y pueden contener errores.',
    greeting:
      '¡Hola! 👋 Soy Training Assistant. Puedo explicarte qué es Training, cómo funciona y cómo empezar. ¿Qué te gustaría saber?',
    quickPrompts: {
      howItWorks: '¿Cómo funciona?',
      start: '¿Cómo empiezo?',
      plans: 'Planes',
      training: 'Entrenamiento',
      nutrition: 'Nutrición',
      progress: 'Progreso',
    },
  },
  composer: {
    label: 'Mensaje para Training Assistant',
    placeholder: 'Escribe tu mensaje...',
    send: 'Enviar mensaje',
    hint: 'Enter para enviar, Shift + Enter para nueva línea',
    remaining: 'Quedan {{count}} caracteres',
  },
  you: 'Tú',
  typing: 'Training Assistant está escribiendo…',
  status: {
    CONNECTING: 'Conectando…',
    CONNECTED: 'En línea',
    RECONNECTING: 'Reconectando…',
    DISCONNECTED: 'Sin conexión',
    ERROR: 'No disponible',
  },
  banner: {
    reconnecting: 'Se perdió la conexión. Intentando reconectar...',
    disconnected: 'Estás desconectado del asistente.',
    error: 'El asistente no está disponible en este momento.',
    sessionExpired: 'Tu sesión terminó. Vuelve a iniciar sesión para seguir conversando.',
    tooManyConnections: 'El asistente está abierto en demasiadas pestañas. Cierra una e inténtalo de nuevo.',
    reconnect: 'Reconectar',
  },
  errors: {
    AI_UNAVAILABLE:
      'En este momento no puedo generar una respuesta. Inténtalo nuevamente en unos momentos.',
    QUOTA_EXHAUSTED:
      'El asistente público alcanzó su límite de mensajes por hoy. Si tienes una cuenta, inicia sesión para seguir conversando.',
    RATE_LIMITED: 'Estás enviando mensajes muy rápido. Espera un momento e inténtalo de nuevo.',
    BUSY: 'Espera a que termine la respuesta actual.',
    MESSAGE_TOO_LONG: 'El mensaje es demasiado largo.',
    INVALID_MESSAGE: 'No se pudo enviar el mensaje.',
    CONNECTION_LOST: 'Se perdió la conexión antes de recibir la respuesta.',
    TIMEOUT: 'La respuesta tardó demasiado.',
    GENERIC: 'No se pudo enviar el mensaje.',
  },
  retry: 'Reintentar',
};
