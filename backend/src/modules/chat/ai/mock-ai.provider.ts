import { publicAssistantKnowledgeFor } from '../public-assistant-knowledge';
import { ChatLocale } from '../types/chat.types';
import { AiProviderName } from './ai-provider-name.enum';
import {
  AiChatInput,
  AiChatMessage,
  AiChatResult,
  AiProvider,
} from './ai-provider.interface';

export type MockIntent =
  | 'HEALTH'
  | 'GREETING'
  | 'PRICING'
  | 'LOGIN'
  | 'SUPPORT'
  | 'CONTRACT_SERVICE'
  | 'START'
  | 'PLANS'
  | 'TRAINER'
  | 'TRAINING'
  | 'NUTRITION'
  | 'PROGRESS'
  | 'CHECK_INS'
  | 'HOW_IT_WORKS'
  | 'UNKNOWN';

const INTENT_PATTERNS: ReadonlyArray<[MockIntent, RegExp]> = [
  ['HEALTH', /\b(dolor|lesion|mareo|medic|pain|injur|dizzy|doctor)\w*\b/],
  [
    'GREETING',
    /^(hola|buenas|buenos dias|hello|hi|hey|good (morning|afternoon))( que tal)?$/,
  ],
  [
    'PRICING',
    /\b(precio|precios|cuanto( cuesta| vale)?|cuesta|costo|costos|tarifa|price|prices|how much|cost)\b/,
  ],
  [
    'LOGIN',
    /\b(ya tengo (una )?cuenta|iniciar sesion|inicio( de)? sesion|ingresar|como (entro|ingreso|accedo)|donde (entro|ingreso|inicio)|entrar( a| en)?( mi)?( cuenta| training)?|no puedo (entrar|ingresar|acceder)|acceder a mi cuenta|sign in|log ?in|already have an account|cannot log in|can'?t (log|sign) in)\b/,
  ],
  [
    'SUPPORT',
    /\b(soporte|ayuda|hablar con alguien|comunic\w* con alguien|con quien hablo|contacto|contactar|mas informacion|necesito (mas )?informacion|support|help|talk to someone|speak to someone|contact|more information)\b/,
  ],
  [
    'CONTRACT_SERVICE',
    /\b(contrat\w*|adquir\w*|quiero pagar|comprar (la )?(app|aplicacion|servicio)|purchase (the )?(app|service)|hire (the )?(service|app|trainer)|subscribe|how (do i|can i) (buy|purchase|hire))\b/,
  ],
  [
    'START',
    /\b(empez\w*|empiez\w*|comenz\w*|comienz\w*|quiero iniciar|quiero entrenar|quiero (una )?cuenta|obtengo (una )?cuenta|conseguir (una )?cuenta|me interesa( la app| training)?|inscrib\w*|que necesito|get started|start using|want to start|interested in|get (an )?account)\b/,
  ],
  [
    'PLANS',
    /\b(plan|planes|servicios disponibles|solicito|solicitar|tienen planes|ver (los )?planes|comprar (un )?plan|que incluye|plans?|available services|request (a )?plan)\b/,
  ],
  [
    'TRAINER',
    /\b(entrenador|entrenadora|coach|personal trainer|conseguir (un )?entrenador|consigo (un )?entrenador)\b/,
  ],
  [
    'TRAINING',
    /(entrenamient|\btraining\b|rutina|ejercicio|serie|repeticion|workout|exercise|reps?\b|sets?\b)/,
  ],
  ['NUTRITION', /(nutri|comida|dieta|aliment|meal|food|diet)/],
  ['PROGRESS', /(progres|medida|peso|foto|measure|weight|photo)/],
  ['CHECK_INS', /(check ?in|seguimiento)/],
  [
    'HOW_IT_WORKS',
    /(como funciona|que es|plataforma|how does|what is|platform|\bapp\b|\bservicio\b)/,
  ],
];

const FOLLOW_UP =
  /^(y |and |entonces |ok |vale |bueno )?(donde|and where|what about|y eso)/;

const MEMBER_RESPONSES: Record<ChatLocale, Record<MockIntent, string>> = {
  es: {
    HEALTH:
      'No puedo dar consejos médicos. Si tienes dolor, una lesión o síntomas fuertes, detén el ejercicio y consulta con un profesional de la salud. También puedes avisar a tu entrenador.',
    GREETING: '¡Hola! Soy Training Assistant. ¿En qué puedo ayudarte?',
    PRICING:
      'Los precios no están publicados en la plataforma. Debes confirmar cualquier información comercial con el equipo de Training.',
    LOGIN:
      "Si ya tienes una cuenta habilitada, utiliza la opción 'Iniciar sesión' de la página principal.",
    SUPPORT:
      'Puedo orientarte sobre el uso de la plataforma. Si necesitas ayuda con tu cuenta, contacta a la organización que la habilitó.',
    CONTRACT_SERVICE:
      'Training funciona como una plataforma privada de trabajo entre entrenadores y clientes. La información comercial debe confirmarse con el equipo de Training.',
    START:
      'Para comenzar, la organización debe habilitar tu cuenta y asignarte un entrenador. No existe registro público.',
    PLANS:
      'Tu entrenador prepara los planes que ves dentro de Training. Las opciones comerciales no están publicadas en la plataforma.',
    TRAINER:
      'Tu perfil muestra el entrenador que te fue asignado. La asignación la administra la organización.',
    TRAINING:
      'Puedo ayudarte a entender cómo funciona tu entrenamiento dentro de la plataforma.',
    NUTRITION:
      'En la sección Nutrición ves el plan de comidas que te asignó tu entrenador, con sus objetivos diarios.',
    PROGRESS:
      'En Progreso puedes revisar tu historial de ejercicios y tendencias corporales por período.',
    CHECK_INS:
      'En Seguimientos cuentas cómo fue el período y, cuando tu entrenador lo revisa, ves sus comentarios.',
    HOW_IT_WORKS:
      'La plataforma conecta a clientes con su entrenador: tu entrenador asigna planes y tú registras tus entrenamientos y tu progreso.',
    UNKNOWN:
      'Puedo ayudarte con información sobre entrenamientos, nutrición, progreso, acceso y cómo funciona Training. Dime qué necesitas y te orientaré.',
  },
  en: {
    HEALTH:
      'I can’t give medical advice. If you have pain, an injury, or severe symptoms, stop exercising and talk to a health professional. You can also let your trainer know.',
    GREETING: 'Hi! I’m Training Assistant. How can I help you?',
    PRICING:
      'Prices are not published in the platform. Confirm any commercial information with the Training team.',
    LOGIN:
      "If you already have an enabled account, use 'Sign in' on the home page.",
    SUPPORT:
      'I can guide you through the platform. For account help, contact the organisation that enabled your access.',
    CONTRACT_SERVICE:
      'Training is a private platform where trainers and clients work together. Commercial information must be confirmed with the Training team.',
    START:
      'To get started, the organisation must enable your account and assign a trainer. There is no public sign-up.',
    PLANS:
      'Your trainer prepares the plans you see in Training. Commercial service options are not published in the platform.',
    TRAINER:
      'Your profile shows your assigned trainer. Trainer assignment is managed by the organisation.',
    TRAINING:
      'I can help you understand how your training works inside the platform.',
    NUTRITION:
      'The Nutrition section shows the meal plan your trainer assigned, with its daily targets.',
    PROGRESS:
      'Progress shows your exercise history and body trends for a selected period.',
    CHECK_INS:
      'In Check-ins you share how the period went, and you see your trainer’s feedback once it is reviewed.',
    HOW_IT_WORKS:
      'The platform connects clients with their trainer: your trainer assigns plans and you record your workouts and progress.',
    UNKNOWN:
      'I can help with training, nutrition, progress, access, and how Training works. Tell me what you need and I will guide you.',
  },
};

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyMockIntent(message: string): MockIntent {
  const normalized = normalize(message);
  return (
    INTENT_PATTERNS.find(([, pattern]) => pattern.test(normalized))?.[0] ??
    'UNKNOWN'
  );
}

/** Kept as a compatibility alias for existing callers. */
export const classifyMockTopic = classifyMockIntent;

function isFollowUp(message: string): boolean {
  return FOLLOW_UP.test(normalize(message));
}

/** Uses the latest user turn; short follow-ups reuse the previous user intent. */
export function classifyMockIntentFromHistory(
  messages: readonly Pick<AiChatMessage, 'role' | 'content'>[],
): MockIntent {
  const userTurns = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content);
  const current = userTurns[userTurns.length - 1] ?? '';
  const intent = classifyMockIntent(current);
  if (intent !== 'UNKNOWN') {
    return intent;
  }
  const previous = userTurns[userTurns.length - 2];
  if (previous && isFollowUp(current)) {
    return classifyMockIntent(previous);
  }
  return 'UNKNOWN';
}

function publicResponse(intent: MockIntent, locale: ChatLocale): string {
  const knowledge = publicAssistantKnowledgeFor(locale);
  const responses: Record<MockIntent, string> = {
    HEALTH: MEMBER_RESPONSES[locale].HEALTH,
    GREETING: MEMBER_RESPONSES[locale].GREETING,
    PRICING: knowledge.pricingExplanation,
    LOGIN: knowledge.loginExplanation,
    SUPPORT: knowledge.supportExplanation,
    CONTRACT_SERVICE: knowledge.contractServiceExplanation,
    START: knowledge.onboardingExplanation,
    PLANS: knowledge.planRequestExplanation,
    TRAINER: knowledge.trainerExplanation,
    TRAINING: knowledge.trainingCapabilities,
    NUTRITION: knowledge.nutritionCapabilities,
    PROGRESS: knowledge.progressCapabilities,
    CHECK_INS: knowledge.progressCapabilities,
    HOW_IT_WORKS: knowledge.howItWorks,
    UNKNOWN: knowledge.unknownExplanation,
  };
  return responses[intent];
}

/** Deterministic, offline provider for development and automated tests. */
export class MockAiProvider implements AiProvider {
  readonly name = AiProviderName.Mock;

  generateResponse(input: AiChatInput): Promise<AiChatResult> {
    const intent = classifyMockIntentFromHistory(input.messages);
    const publicAudience = input.messages.some(
      (message) =>
        message.role === 'system' &&
        message.content.includes('PUBLIC_ASSISTANT_CONTEXT'),
    );

    return Promise.resolve({
      content: publicAudience
        ? publicResponse(intent, input.locale)
        : MEMBER_RESPONSES[input.locale][intent],
      model: 'mock',
      truncated: false,
    });
  }
}
