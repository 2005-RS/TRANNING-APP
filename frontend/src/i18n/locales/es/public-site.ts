import { publicSiteCopySource } from '@/features/public-site/copy';
import type { LooseCopy } from '@/i18n/live-copy';

export const esPublicSite: LooseCopy<typeof publicSiteCopySource> = {
  nav: {
    label: 'Sitio',
    home: 'Inicio',
    platform: 'Plataforma',
    training: 'Entrenamiento',
    progress: 'Progreso',
    about: 'Acerca de',
    signIn: 'Iniciar sesión',
    goToApp: 'Ir a mi espacio',
    openMenu: 'Abrir menú del sitio',
    closeMenu: 'Cerrar menú del sitio',
    nutrition: 'Nutrición',
    how: 'Cómo funciona',
    start: 'Comenzar',
    pages: 'Páginas',
  },
  landing: {
    eyebrow: 'Coaching, entrenamiento y nutrición en una sola app',
    headline: ['Entrena.', 'Aliméntate.', 'Evoluciona.'],
    body: 'Planes de entrenamiento personalizados, planes de alimentación, seguimiento de tu progreso y un coach que acompaña cada paso, en una sola experiencia.',
    primary: 'Comenzar',
    secondary: 'Conocer más',
    demoLabel: 'Vista de la app · datos de ejemplo',
    scrollHint: 'Desliza',
    screens: {
      date: 'Martes',
      greeting: 'Buenos días',
      inProgress: 'En curso',
      workoutName: 'Tren inferior A',
      workoutMeta: 'Bloque de fuerza · 5 ejercicios',
      continueWorkout: 'Continuar entrenamiento',
      week: 'Esta semana',
      weekCount: '4 sesiones',
      days: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
      checkIn: 'Check-in',
      checkInMeta: 'Revisado · comentario del entrenador',
      exerciseOf: 'Ejercicio 2 de 5',
      rest: 'descanso',
      exercise: 'Sentadilla trasera',
      set: 'Serie',
      logSet: 'Registrar serie',
      today: 'Hoy',
      remaining: 'restantes',
      target: 'Objetivo',
      eaten: 'Consumido',
      protein: 'Proteína',
      carbs: 'Carbohidratos',
      fat: 'Grasa',
      meals: ['Avena y yogur', 'Pollo y arroz', 'Salmón y papa', 'Almendras'],
      progress: 'Progreso',
      estimatedMax: 'Sentadilla · 1RM estimado',
      bodyWeight: 'Peso corporal',
      waist: 'Cintura',
      weeklyCheckIn: 'Check-in semanal',
      reviewed: 'Revisado por tu entrenador',
    },
    heroCards: {
      workoutTitle: 'Entrenamiento de hoy',
      workoutName: 'Tren inferior A',
      workoutDetail: 'Sentadilla · 4 × 8 · 80 kg',
      nutritionTitle: 'Nutrición de hoy',
      nutritionRemaining: 'kcal restantes',
      progressTitle: 'Volumen de entrenamiento',
      progressDetail: 'Últimas 8 semanas',
    },
    benefits: {
      title: 'Lo que obtienes',
      training: { title: 'Entrenamiento personalizado', body: 'Planes hechos para ti, serie a serie.' },
      nutrition: { title: 'Plan de alimentación', body: 'Comidas y metas diarias de tu coach.' },
      progress: { title: 'Seguimiento del progreso', body: 'Historial, medidas y check-ins.' },
      coach: { title: 'Acompañamiento profesional', body: 'Un entrenador que revisa y ajusta.' },
    },
    goals: {
      eyebrow: 'Objetivos',
      title: ['Un plan para', 'cada objetivo'],
      body: 'Tu coach adapta el entrenamiento y la alimentación a lo que quieres lograr.',
      fatLoss: { title: 'Pérdida de grasa', body: 'Entrenamiento y comidas alineados con una meta calórica.' },
      muscle: { title: 'Ganancia muscular', body: 'Cargas progresivas y planes con foco en proteína.' },
      performance: { title: 'Rendimiento', body: 'Fuerza, acondicionamiento y sesiones estructuradas.' },
      wellbeing: { title: 'Bienestar', body: 'Hábitos sostenibles, energía y constancia.' },
    },
    showcase: {
      eyebrow: 'La app',
      title: ['Todo tu progreso', 'en un solo lugar'],
      body: 'La misma app te acompaña desde la primera sesión hasta el último check-in.',
      steps: {
        dashboard: { label: 'Inicio', title: 'Tu día de un vistazo', body: 'El entrenamiento de hoy, tu semana y tu último check-in.' },
        training: { label: 'Entrenamiento', title: 'Cada serie, registrada', body: 'Sigue el plan en modo enfoque y registra repeticiones y peso.' },
        nutrition: { label: 'Nutrición', title: 'Tu plan, tus comidas', body: 'Consulta las comidas prescritas y registra lo que comes.' },
        progress: { label: 'Progreso', title: 'Mira lo que cambia', body: 'Tendencias, medidas y check-ins con tu coach.' },
      },
    },
    training: {
      eyebrow: 'Entrenamiento',
      title: ['Entrena con', 'propósito'],
      body: 'Sesiones estructuradas diseñadas por tu coach. Tú solo llegas y registras.',
      layers: {
        exercise: 'Ejercicio',
        exerciseValue: 'Peso muerto rumano',
        sets: 'Series × repeticiones',
        setsValue: '4 × 8',
        weight: 'Peso',
        weightValue: '70 kg',
        progress: 'Sesión',
        progressValue: '3 de 5 ejercicios',
        completed: 'Entrenamiento completado',
      },
      points: ['Planes adaptados a tu objetivo', 'Biblioteca de ejercicios con demostraciones', 'Pesos y repeticiones registrados serie a serie'],
    },
    nutrition: {
      eyebrow: 'Nutrición',
      title: ['Alimenta', 'tu progreso'],
      body: 'Planes de alimentación personalizados que prescribe tu coach, con comidas, porciones y metas diarias. Registra lo que comes y compáralo con tu plan.',
      card: {
        meal: 'Almuerzo · bowl de ensalada',
        calories: 'kcal',
        protein: 'Proteína',
        carbs: 'Carbohidratos',
        fat: 'Grasas',
        daily: 'Meta diaria',
        dailyValue: '2,400 kcal',
        plan: 'Del plan de tu coach',
      },
      points: ['Comidas y porciones de tu plan', 'Búsqueda de alimentos, código de barras y alimentos propios', 'Calorías y macros frente a tu meta'],
      disclaimer: 'Los planes de alimentación son orientación de coaching, no consejo médico.',
    },
    progress: {
      eyebrow: 'Progreso',
      title: ['Mide tu', 'progreso'],
      body: 'Historial de ejercicios, medidas corporales y check-ins en una misma línea de tiempo que revisas con tu coach.',
      chartTitle: 'Fuerza estimada · sentadilla',
      bars: { adherence: 'Adherencia al plan', sessions: 'Sesiones esta semana', checkIn: 'Check-in revisado' },
      checkInTitle: 'Check-in semanal',
      checkInBody: 'Recibiste feedback de tu coach',
    },
    steps: {
      eyebrow: 'Cómo funciona',
      title: 'Del primer plan a un cambio que se queda',
    },
    final: {
      title: ['Tu cambio', 'empieza hoy.'],
      body: 'Pide acceso a tu coach o a tu organización, inicia sesión y comienza.',
      primary: 'Comenzar',
    },
    footer: {
      explore: 'Explora',
      access: 'Acceso',
    },
  },
  footer: {
    note: 'Plataforma privada de coaching para entrenadores y sus clientes.',
    access: 'No hay registro público. Las cuentas las crea un administrador.',
  },
  accessNote:
    'No hay registro público. El administrador de la organización que usa la plataforma crea tu cuenta.',
  cta: {
    title: '¿Ya tienes una cuenta?',
    body: 'Inicia sesión con el correo y la contraseña que te dio tu entrenador o administrador.',
    signIn: 'Iniciar sesión',
  },
  assistant: {
    title: '¿Dudas? Pregúntale a Training Assistant',
    body: 'Usa el botón de chat en la esquina de la pantalla para preguntar cómo funciona la plataforma. Solo conoce información pública del producto: nunca datos de cuentas ni datos personales.',
  },
  home: {
    title: 'Inicio',
    heading: 'Entrena con precisión.',
    body: 'Planes, sesiones y progreso en una superficie clara para entrenadores y atletas.',
    primary: 'Iniciar sesión',
    secondary: 'Conocer la plataforma',
    rolesTitle: 'Una plataforma, tres roles',
    roles: {
      client: {
        title: 'Clientes',
        body: 'Siguen el plan que les asigna su entrenador, registran cada serie en un modo de entrenamiento enfocado y ven su progreso en el tiempo.',
      },
      trainer: {
        title: 'Entrenadores',
        body: 'Crean planes de entrenamiento y nutrición para sus clientes asignados, revisan su progreso y responden sus seguimientos.',
      },
      admin: {
        title: 'Administradores',
        body: 'Crean las cuentas de entrenadores y clientes, asignan cada cliente a un entrenador y gestionan los catálogos de ejercicios y alimentos.',
      },
    },
    stepsTitle: 'Cómo funciona',
    steps: {
      one: {
        title: 'Se crean las cuentas',
        body: 'Un administrador crea las cuentas de entrenadores y clientes y asigna cada cliente a un entrenador.',
      },
      two: {
        title: 'El entrenador planifica',
        body: 'El entrenador arma un plan de entrenamiento a partir de plantillas y, si hace falta, un plan de nutrición.',
      },
      three: {
        title: 'El cliente entrena',
        body: 'El cliente inicia entrenamientos desde su plan, registra sus series y completa la sesión.',
      },
      four: {
        title: 'Se revisa el progreso',
        body: 'El cliente sigue su progreso y envía seguimientos; el entrenador los revisa y responde con comentarios.',
      },
    },
  },
  platform: {
    title: 'Plataforma',
    heading: 'Todo lo que necesita una relación de coaching, en un solo lugar.',
    body: 'Cada rol ve solo su propio espacio, y cada entrenador solo ve a los clientes que tiene asignados.',
    modules: {
      training: {
        title: 'Planes de entrenamiento',
        body: 'Los entrenadores crean planes para cada cliente a partir de plantillas reutilizables y ajustan ejercicios, series y objetivos.',
      },
      focus: {
        title: 'Modo de entrenamiento enfocado',
        body: 'Los clientes registran repeticiones y peso serie por serie, con temporizador de descanso, y luego completan o cancelan la sesión.',
      },
      progress: {
        title: 'Progreso',
        body: 'Historial y tendencias por ejercicio, además de tendencias de medidas corporales de 7 a 365 días.',
      },
      body: {
        title: 'Progreso corporal y fotos',
        body: 'Los clientes registran medidas corporales y suben fotos de progreso privadas para compararlas en el tiempo.',
      },
      nutrition: {
        title: 'Planes de nutrición',
        body: 'Los entrenadores prescriben objetivos diarios, comidas y alimentos; los clientes ven su plan en modo de solo lectura.',
      },
      checkIns: {
        title: 'Seguimientos',
        body: 'Los clientes cuentan cómo fue un período; los entrenadores revisan cada seguimiento y escriben sus comentarios.',
      },
      trainer: {
        title: 'Espacio del entrenador',
        body: 'Un panel con cola de atención, la lista de clientes asignados y una vista detallada de cada cliente.',
      },
      admin: {
        title: 'Administración',
        body: 'Cuentas, asignaciones entrenador–cliente y los catálogos compartidos de ejercicios y alimentos.',
      },
    },
  },
  training: {
    title: 'Entrenamiento',
    heading: 'Del plan del entrenador a cada serie registrada.',
    body: 'El entrenador diseña el programa; el cliente lo sigue sin adivinar.',
    features: {
      templates: {
        title: 'Plantillas de entrenamiento',
        body: 'Los entrenadores mantienen una biblioteca de entrenamientos reutilizables con ejercicios, series, repeticiones y descansos prescritos.',
      },
      plans: {
        title: 'Planes por cliente',
        body: 'Cada plan se crea para un cliente concreto, se puede ajustar y avanza por estados claros.',
      },
      start: {
        title: 'Iniciar o retomar',
        body: 'El cliente inicia un entrenamiento desde su plan actual o retoma una sesión que ya está en curso.',
      },
      sets: {
        title: 'Registro serie por serie',
        body: 'Controles grandes, pensados para el gimnasio, para anotar repeticiones y peso en cada serie.',
      },
      rest: {
        title: 'Temporizador de descanso',
        body: 'Un temporizador de descanso local entre series mantiene el ritmo de la sesión.',
      },
      exercises: {
        title: 'Biblioteca de ejercicios',
        body: 'Un catálogo de ejercicios compartido, con material demostrativo cuando está disponible.',
      },
    },
  },
  progress: {
    title: 'Progreso',
    heading: 'Mira qué está cambiando, sin ruido.',
    body: 'Números y tendencias neutrales. La interpretación queda entre el cliente y su entrenador.',
    features: {
      exercises: {
        title: 'Historial por ejercicio',
        body: 'Cada ejercicio guarda su historial y su tendencia, para ver el progreso sesión tras sesión.',
      },
      measurements: {
        title: 'Medidas corporales',
        body: 'Registra y edita medidas y revisa tendencias de 7, 30, 90, 180 o 365 días.',
      },
      photos: {
        title: 'Fotos de progreso privadas',
        body: 'Las fotos se guardan de forma privada y solo las ven el cliente y su entrenador asignado.',
      },
      checkIns: {
        title: 'Seguimientos con comentarios',
        body: 'Guarda un seguimiento como borrador, envíalo y lee los comentarios del entrenador cuando lo revise.',
      },
    },
  },
  about: {
    title: 'Acerca de',
    heading: 'Un espacio privado para el coaching.',
    body: 'Training Platform conecta a los entrenadores con los clientes que tienen asignados. Está pensada para organizaciones que entrenan personas, no como una red social abierta.',
    sections: {
      privacy: {
        title: 'Privada por diseño',
        body: 'Los datos de entrenamiento son privados. Cada cliente ve sus propios datos; cada entrenador solo ve a sus clientes asignados; los administradores gestionan cuentas, no entrenan.',
      },
      access: {
        title: 'Acceso',
        body: 'No hay registro público ni pagos dentro de la app. Las cuentas las crea un administrador de la organización.',
      },
      assistant: {
        title: 'Training Assistant',
        body: 'Un asistente con IA responde preguntas sobre cómo funciona la plataforma. No es un médico y no da consejos médicos.',
      },
      languages: {
        title: 'Idiomas',
        body: 'La interfaz está disponible en español e inglés.',
      },
    },
  },
};
