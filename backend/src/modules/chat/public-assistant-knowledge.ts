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
  publicRegistrationAvailable: true,
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
        'El entrenador puede preparar un plan nutricional con objetivos diarios, comidas y alimentos. El cliente puede consultar el plan y usar el diario de alimentos para registrar lo que come.',
      progressCapabilities:
        'El cliente puede revisar su historial de ejercicios, tendencias, medidas corporales, fotos privadas de progreso y seguimientos con comentarios de su entrenador.',
      onboardingExplanation:
        '¡Excelente! Para comenzar, crea una cuenta gratis en /register y usa la app por tu cuenta. Si quieres Pro, incluye un entrenador que asigna planes y revisa tu progreso; se paga por SINPE Móvil y se activa cuando el equipo verifica el pago.',
      planRequestExplanation:
        'Puedes crear una cuenta gratis en /register. El plan Pro incluye un entrenador; el precio se muestra dentro de la app en “Mi plan”. Se paga por SINPE Móvil y no voy a inventarte un precio.',
      contractServiceExplanation:
        'Training te permite crear una cuenta gratis y usar la app por tu cuenta. Pro añade un entrenador para tu proceso de entrenamiento; puedes ver sus detalles dentro de la app en “Mi plan”.',
      loginExplanation:
        "Si ya tienes una cuenta, utiliza la opción 'Iniciar sesión' de la página principal para acceder a Training. Si no, crea una cuenta gratis en /register.",
      trainerExplanation:
        'Training permite que un entrenador gestione tus planes y seguimiento. Pro incluye un entrenador asignado; sus detalles se muestran dentro de la app en “Mi plan”.',
      supportExplanation:
        'Claro. Puedo orientarte sobre el producto y cómo comenzar. Este sitio no publica todavía un teléfono ni un correo; para hablar con el equipo de Training, usa el canal oficial por el que conociste el servicio y no compartas datos personales en este chat.',
      pricingExplanation:
        'Puedes crear una cuenta gratis en /register. El precio de Pro se muestra dentro de la app en “Mi plan”; se paga por SINPE Móvil. No voy a inventarte un precio.',
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
        'The trainer can prepare a nutrition plan with daily targets, meals, and foods. The client can view the plan and use the food journal to log what they eat.',
      progressCapabilities:
        'The client can review exercise history, trends, body measurements, private progress photos, and check-ins with trainer feedback.',
      onboardingExplanation:
        'Great! To get started, create a free account at /register and use the app on your own. Pro includes a trainer who assigns plans and reviews progress; it is paid through SINPE Móvil and activates after the team verifies payment.',
      planRequestExplanation:
        'You can create a free account at /register. Pro includes a trainer; its price is shown inside the app on “My plan”. It is paid through SINPE Móvil, and I will not invent a price.',
      contractServiceExplanation:
        'Training lets you create a free account and use the app on your own. Pro adds a trainer to your training process; its details are available inside the app on “My plan”.',
      loginExplanation:
        "If you already have an account, use 'Sign in' on the home page to access Training. Otherwise, create a free account at /register.",
      trainerExplanation:
        'Training lets a trainer manage your plans and follow-up. Pro includes an assigned trainer; its details are shown inside the app on “My plan”.',
      supportExplanation:
        'Of course. This site does not currently publish a specific phone number, email address, or other contact channel. To speak with the Training team, use the official channel that directed you to this service; do not share personal details in this chat.',
      pricingExplanation:
        'You can create a free account at /register. The Pro price is shown inside the app on “My plan” and is paid through SINPE Móvil. I will not invent a price.',
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
