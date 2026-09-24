import {
  adminCopySource,
  clientCopySource,
  navigationCopySource,
  trainerCopySource,
} from '@/features/navigation/copy';
import type { LooseCopy } from '@/i18n/live-copy';

export const esNavigation: LooseCopy<typeof navigationCopySource> = {
  skipToMain: 'Saltar al contenido principal',
  openNavigation: 'Abrir navegación',
  closeNavigation: 'Cerrar navegación',
  primaryNav: 'Principal',
  moreNav: 'Más',
  userMenu: 'Menú de la cuenta',
  role: 'Rol',
  theme: 'Tema',
  themeDark: 'Oscuro',
  themeLight: 'Claro',
  themeSystem: 'Sistema',
  comingSoon: 'Próximamente',
  placeholderBody: 'Todavía no hay nada aquí.',
  notFoundTitle: 'Página no encontrada',
  notFoundBody: 'Esa página no existe o ya no está disponible.',
  goToHome: 'Ir al inicio',
  goToLogin: 'Ir a iniciar sesión',
  routeErrorTitle: 'Ocurrió un error',
  routeErrorBody: 'No se pudo mostrar la página. Inténtalo de nuevo.',
  retry: 'Intentar de nuevo',
  reload: 'Recargar',
  roles: {
    CLIENT: 'Cliente',
    TRAINER: 'Entrenador',
    ADMIN: 'Administración',
  },
};

export const esClientNav: LooseCopy<typeof clientCopySource> = {
  mainNav: 'Principal',
  home: { label: 'Inicio', title: 'Inicio', description: 'Tu resumen de entrenamiento.' },
  training: {
    label: 'Entrenamiento',
    title: 'Entrenamiento',
    description: 'Inicia o continúa un entrenamiento de tu plan actual.',
  },
  workout: {
    title: 'Entrenamiento',
    description: 'Registra esta sesión.',
    close: 'Cerrar entrenamiento',
  },
  progress: {
    label: 'Progreso',
    title: 'Progreso',
    description: 'Entrenamiento completado, tendencias corporales e historial de ejercicios.',
  },
  nutrition: {
    label: 'Nutrición',
    title: 'Nutrición',
    description: 'Tu plan de comidas asignado y los objetivos diarios.',
  },
  more: { label: 'Más', title: 'Más', description: 'Cuerpo, seguimientos y notificaciones.' },
  body: {
    label: 'Progreso corporal',
    title: 'Progreso corporal',
    description: 'Registra medidas y fotos privadas de progreso.',
  },
  checkIns: {
    label: 'Seguimientos',
    title: 'Seguimientos',
    description: 'Comparte cómo fue el período y mira los comentarios del entrenador.',
  },
  notifications: {
    label: 'Notificaciones',
    title: 'Notificaciones',
    description: 'Las notificaciones aparecerán aquí.',
  },
};

export const esTrainerNav: LooseCopy<typeof trainerCopySource> = {
  dashboard: {
    label: 'Panel principal',
    title: 'Panel principal',
    description: 'Lo que necesita atención entre tus clientes asignados.',
  },
  clients: {
    label: 'Clientes',
    title: 'Clientes',
    description: 'Clientes asignados y la siguiente acción de coaching.',
  },
  checkIns: {
    label: 'Seguimientos',
    title: 'Seguimientos',
    description: 'Seguimientos enviados en espera de revisión.',
  },
  training: {
    label: 'Entrenamiento',
    title: 'Entrenamiento',
    description: 'Plantillas de entrenamiento usadas en los planes de clientes.',
  },
  nutrition: {
    label: 'Nutrición',
    title: 'Nutrición',
    description: 'Alimentos usados al armar planes de comidas prescritos.',
  },
  exercises: {
    label: 'Ejercicios',
    title: 'Ejercicios',
    description: 'Catálogo usado en plantillas y planes.',
  },
  notifications: {
    label: 'Notificaciones',
    title: 'Notificaciones',
    description: 'Las notificaciones aparecerán aquí.',
  },
};

export const esAdminNav: LooseCopy<typeof adminCopySource> = {
  dashboard: {
    label: 'Panel principal',
    title: 'Panel principal',
    description: 'Conteos operativos de cuentas, asignaciones y planes activos.',
  },
  trainers: {
    label: 'Entrenadores',
    title: 'Entrenadores',
    description: 'Crea y administra cuentas de entrenadores.',
  },
  clients: {
    label: 'Clientes',
    title: 'Clientes',
    description: 'Crea y administra cuentas de clientes.',
  },
  assignments: {
    label: 'Asignaciones',
    title: 'Asignaciones',
    description: 'Define, cambia y revisa asignaciones de entrenadores.',
  },
  exercises: {
    label: 'Ejercicios',
    title: 'Ejercicios',
    description: 'Administra el catálogo compartido de ejercicios.',
  },
  foods: {
    label: 'Alimentos',
    title: 'Alimentos',
    description: 'Administra el catálogo nutricional de alimentos.',
  },
  notifications: {
    label: 'Notificaciones',
    title: 'Notificaciones',
    description: 'Las notificaciones aparecerán aquí.',
  },
};
