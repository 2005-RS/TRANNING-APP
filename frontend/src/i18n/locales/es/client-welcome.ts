import { clientWelcomeCopySource } from '@/features/client-welcome/copy';
import type { LooseCopy } from '@/i18n/live-copy';

export const esClientWelcome: LooseCopy<typeof clientWelcomeCopySource> = {
  progress: (step) => `Paso ${step} de 3`,
  skip: 'Saltar',
  welcome: '¡Bienvenido, {{name}}!',
  value: 'Entrena con rutinas listas, registra tu progreso y tu alimentación.',
  next: 'Continuar',
  choose: 'Elige tu primera rutina',
  useRoutine: 'Usar esta rutina',
  ready: '¡Listo!',
  readyBody: 'Tu rutina está lista.',
  start: 'Empezar ahora',
  home: 'Ir a Inicio',
  loading: 'Cargando rutinas',
  empty: 'Todavía no hay rutinas disponibles.',
  failed: 'No se pudo crear tu rutina. Inténtalo de nuevo.',
};
