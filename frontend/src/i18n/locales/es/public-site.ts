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
    eyebrow: 'Espacio de entrenamiento',
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
    eyebrow: 'Plataforma',
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
    eyebrow: 'Entrenamiento',
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
    eyebrow: 'Progreso',
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
    eyebrow: 'Acerca de',
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
