import { notificationsCopySource } from '@/features/notifications/copy';
import type { LooseCopy } from '@/i18n/live-copy';

export const esNotifications: LooseCopy<typeof notificationsCopySource> = {
  title: 'Notificaciones',
  description: {
    client: 'Novedades sobre tus seguimientos y planes.',
    trainer: 'Novedades sobre tus clientes asignados.',
    admin: 'Novedades dirigidas a tu cuenta.',
  },
  loadingLabel: 'Cargando notificaciones',
  filters: {
    label: 'Mostrar',
    all: 'Todas',
    unread: 'No leídas',
  },
  markAllRead: 'Marcar todas como leídas',
  markingAllRead: 'Marcando…',
  markAllReadDone: 'Todas las notificaciones se marcaron como leídas.',
  markRead: 'Marcar como leída',
  markingRead: 'Marcando…',
  unread: 'No leída',
  unreadCount: '{{count}} sin leer',
  open: 'Abrir',
  empty: {
    allTitle: 'Todavía no hay notificaciones',
    allBody: 'Aquí aparecerán las novedades sobre seguimientos y planes.',
    unreadTitle: 'Estás al día',
    unreadBody: 'No hay notificaciones sin leer.',
    showAll: 'Ver todas las notificaciones',
  },
  pagination: {
    label: 'Páginas de notificaciones',
    page: 'Página {{page}} de {{total}}',
    previous: 'Anterior',
    next: 'Siguiente',
  },
  types: {
    CHECK_IN_SUBMITTED: {
      title: 'Seguimiento enviado',
      body: 'Se envió un seguimiento.',
      bodyTrainer: 'Un cliente envió un seguimiento para revisar.',
    },
    CHECK_IN_REVIEWED: {
      title: 'Seguimiento revisado',
      body: 'Tu seguimiento fue revisado. Ábrelo para ver los comentarios.',
      bodyTrainer: 'Se revisó un seguimiento.',
    },
    TRAINING_PLAN_ACTIVATED: {
      title: 'Plan de entrenamiento activo',
      body: 'Ya tienes un plan de entrenamiento activo.',
      bodyTrainer: 'Se activó un plan de entrenamiento para un cliente.',
    },
    NUTRITION_PLAN_ACTIVATED: {
      title: 'Plan de nutrición activo',
      body: 'Ya tienes un plan de nutrición activo.',
      bodyTrainer: 'Se activó un plan de nutrición para un cliente.',
    },
    unknown: {
      title: 'Notificación',
      body: 'Hay una novedad en tu cuenta.',
      bodyTrainer: 'Hay una novedad en tu cuenta.',
    },
  },
  error: {
    retry: 'Reintentar',
    retrying: 'Reintentando…',
    network: 'No se pudieron cargar las notificaciones. Revisa tu conexión e inténtalo de nuevo.',
    markFailed: 'No se pudo actualizar la notificación. Inténtalo de nuevo.',
    notFound: 'Esta notificación ya no está disponible.',
  },
};
