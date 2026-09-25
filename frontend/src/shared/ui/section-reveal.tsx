import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  motionTransition,
  revealHidden,
  revealVisible,
  useReducedMotion,
} from '@/shared/lib/motion';

export function SectionReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={revealHidden(reduceMotion)}
      animate={revealVisible}
      transition={motionTransition('fast', reduceMotion)}
    >
      {children}
    </motion.div>
  );
}
