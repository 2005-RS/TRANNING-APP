import { ChatLocale } from './types/chat.types';

export interface LocalizedPublicAssistantKnowledge {
  productDescription: string;
  howItWorks: string;
  trainingCapabilities: string;
  nutritionCapabilities: string;
  progressCapabilities: string;
  onboardingExplanation: string;
  planRequestExplanation: string;
  contractServiceExplanation: string;
  loginExplanation: string;
  trainerExplanation: string;
  supportExplanation: string;
  pricingExplanation: string;
  unknownExplanation: string;
}

/**
 * Authoritative, non-personal product and onboarding facts available to the
 * anonymous assistant. Keep commercial unknowns explicit instead of guessing.
 */
export const PUBLIC_ASSISTANT_KNOWLEDGE = {
  productName: 'Training',
  publicRegistrationAvailable: false,
  pricingPublished: false,
  contactChannel: null,
  locales: {
    es: {
      productDescription:
        'Training es una plataforma privada para que entrenadores y clientes trabajen juntos.',
      howItWorks:
        'Training conecta al cliente con su entrenador. El entrenador puede asignar entrenamientos y planificación nutricional, mientras el cliente consulta sus ejercicios, registra resultados, completa seguimientos y revisa su progreso.',
      trainingCapabilities:
        'El entrenador prepara el plan de entrenamiento. El cliente puede consultar sus ejercicios, registrar series, repeticiones y peso, usar un temporizador de descanso y completar la sesión.',
      nutritionCapabilities:
        'El entrenador puede preparar un plan nutricional con objetivos diarios, comidas y alimentos. El cliente puede consultarlo en la plataforma; Training no ofrece registro de consumo de alimentos.',
      progressCapabilities:
        'El cliente puede revisar su historial de ejercicios, tendencias, medidas corporales, fotos privadas de progreso y seguimientos con comentarios de su entrenador.',
      onboardingExplanation:
        '¡Excelente! Para comenzar necesitas solicitar información sobre los servicios o planes disponibles. El equipo de Training puede orientarte sobre la opción adecuada y, después de definir tu servicio, habilitar tu acceso para que trabajes con tu entrenador. No hay registro público.',
      planRequestExplanation:
        'Puedes solicitar información sobre los planes al equipo de Training. Actualmente los planes y precios no se publican automáticamente en la plataforma, así que no voy a inventarte un precio ni un catálogo. Si quieres comenzar, puedo explicarte cómo funciona el proceso.',
      contractServiceExplanation:
        'Training funciona como una plataforma para conectar tu proceso de entrenamiento con un entrenador; no se vende como una app descargable independiente. Para comenzar, debes solicitar información sobre los servicios o planes disponibles. Cuando tu acceso sea habilitado podrás ingresar y consultar tus entrenamientos, progreso y planificación.',
      loginExplanation:
        "Si ya tienes una cuenta habilitada, utiliza la opción 'Iniciar sesión' de la página principal para acceder a Training. No necesitas crear otra cuenta.",
      trainerExplanation:
        'Training permite que un entrenador gestione tus planes y seguimiento. La forma de asignación del entrenador depende del servicio acordado; la plataforma no publica disponibilidad ni permite elegir uno desde el asistente. Si quieres comenzar, solicita información al equipo de Training.',
      supportExplanation:
        'Claro. Puedo orientarte sobre el producto y cómo comenzar. Este sitio no publica todavía un teléfono ni un correo; para hablar con el equipo de Training, usa el canal oficial por el que conociste el servicio y no compartas datos personales en este chat.',
      pricingExplanation:
        'Los precios todavía no están publicados en la plataforma. Para conocer el costo debes solicitar información sobre los planes disponibles al equipo de Training.',
      unknownExplanation:
        'Puedo ayudarte con información sobre cómo funciona Training, entrenamientos, nutrición, progreso, acceso y cómo comenzar. Si me dices qué necesitas, te orientaré.',
    },
    en: {
      productDescription:
        'Training is a private platform where trainers and clients work together.',
      howItWorks:
        'Training connects a client with their trainer. The trainer can assign workouts and nutrition planning, while the client views exercises, records results, completes check-ins, and reviews progress.',
      trainingCapabilities:
        'The trainer prepares the training plan. The client can view exercises, record sets, repetitions and weight, use a rest timer, and complete the workout.',
      nutritionCapabilities:
        'The trainer can prepare a nutrition plan with daily targets, meals, and foods. The client can view it in the platform; Training does not provide food-intake logging.',
      progressCapabilities:
        'The client can review exercise history, trends, body measurements, private progress photos, and check-ins with trainer feedback.',
      onboardingExplanation:
        'Great! To get started, request information about the available services or plans. The Training team can help you choose, and after your service is agreed they can enable your access so you can work with your trainer. There is no public sign-up.',
      planRequestExplanation:
        'You can request plan information from the Training team. Plans and prices are not published automatically in the platform, so I will not invent a price or a catalog. If you want to get started, I can explain how the process works.',
      contractServiceExplanation:
        'Training is a platform that connects your training process with a trainer; it is not sold as a standalone downloadable app. To get started, request information about the available services or plans. Once access is enabled, you can sign in and view your workouts, progress, and planning.',
      loginExplanation:
        "If you already have an enabled account, use 'Sign in' on the home page to access Training. You do not need to create another account.",
      trainerExplanation:
        'Training lets a trainer manage your plans and follow-up. How a trainer is assigned depends on the agreed service; the platform does not publish availability or let the assistant choose one. To get started, request information from the Training team.',
      supportExplanation:
        'Of course. This site does not currently publish a specific phone number, email address, or other contact channel. To speak with the Training team, use the official channel that directed you to this service; do not share personal details in this chat.',
      pricingExplanation:
        'Prices are not currently published in the platform. To confirm the cost, request information about the available plans from the Training team.',
      unknownExplanation:
        'I can help with information about how Training works, workouts, nutrition, progress, access, and how to get started. Tell me what you need and I will guide you.',
    },
  } satisfies Record<ChatLocale, LocalizedPublicAssistantKnowledge>,
} as const;

export function publicAssistantKnowledgeFor(
  locale: ChatLocale,
): LocalizedPublicAssistantKnowledge {
  return PUBLIC_ASSISTANT_KNOWLEDGE.locales[locale];
}
