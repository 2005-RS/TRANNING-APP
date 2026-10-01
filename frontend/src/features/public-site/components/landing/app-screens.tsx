import type { ReactNode } from 'react';
import { Apple, Check, Coffee, Dumbbell, Moon, Sun, TrendingUp } from 'lucide-react';
import type { usePublicSiteCopy } from '@/features/public-site/copy';
import { cn } from '@/shared/lib/utils';

export type ScreenCopy = ReturnType<typeof usePublicSiteCopy>['landing']['screens'];

/**
 * Illustrative screens modelled on the real client app (home, workout focus,
 * nutrition "Today", progress). All numbers are sample data for the preview.
 */

function ScreenShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex h-full flex-col gap-3 bg-[#0b0b0d] px-4 pt-10 pb-4 text-[11px]', className)}>
      {children}
    </div>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-white/8 bg-white/[0.035] p-3', className)}>{children}</div>
  );
}

/** Phone frame around a screen; decorative, the copy beside it carries the meaning. */
export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div aria-hidden className={cn('landing-device relative aspect-[9/19] w-full overflow-hidden', className)}>
      <div className="absolute top-2.5 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
      {children}
    </div>
  );
}

export function Ring({
  value,
  size = 44,
  stroke = 5,
  className,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value)}
          className="stroke-primary"
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
      ) : null}
    </div>
  );
}

function Tick({ done, size = 'md' }: { done: boolean; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        size === 'md' ? 'size-5' : 'size-4',
        done ? 'bg-primary text-black' : 'border border-white/20',
      )}
    >
      {done ? <Check className={size === 'md' ? 'size-3' : 'size-2.5'} aria-hidden /> : null}
    </span>
  );
}

export function DashboardScreen({ s }: { s: ScreenCopy }) {
  return (
    <ScreenShell>
      <p className="text-white/50">{s.date}</p>
      <p className="text-lg font-semibold text-white">{s.greeting}</p>
      <Card className="border-primary/30 bg-primary/[0.08]">
        <p className="text-[10px] tracking-wider text-primary uppercase">{s.inProgress}</p>
        <p className="mt-1 text-sm font-semibold text-white">{s.workoutName}</p>
        <p className="text-white/50">{s.workoutMeta}</p>
        <div className="mt-3 rounded-lg bg-primary py-2 text-center font-semibold text-black">{s.continueWorkout}</div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <p className="font-medium text-white">{s.week}</p>
          <p className="text-white/60">{s.weekCount}</p>
        </div>
        <div className="mt-3 flex justify-between">
          {s.days.map((day, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-white/40">{day}</span>
              <span
                className={cn(
                  'size-5 rounded-full border',
                  index < 5 && index !== 2 ? 'border-primary bg-primary/80' : 'border-white/15',
                )}
              />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <p className="font-medium text-white">{s.checkIn}</p>
        <p className="mt-1 text-white/50">{s.checkInMeta}</p>
      </Card>
    </ScreenShell>
  );
}

export function TrainingScreen({ s }: { s: ScreenCopy }) {
  const sets = [
    { kg: 80, done: true },
    { kg: 80, done: true },
    { kg: 82.5, done: false },
    { kg: 82.5, done: false },
  ];
  return (
    <ScreenShell>
      <div className="flex items-center justify-between">
        <p className="text-white/50">{s.exerciseOf}</p>
        <p className="font-mono text-primary">01:30 {s.rest}</p>
      </div>
      <p className="text-lg font-semibold text-white">{s.exercise}</p>
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04]">
        <Dumbbell className="size-8 text-white/30" aria-hidden />
      </div>
      <Card className="space-y-2">
        {sets.map((set, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-white/50">
              {s.set} {index + 1}
            </span>
            <span className="font-mono text-white">8 × {set.kg} kg</span>
            <Tick done={set.done} />
          </div>
        ))}
      </Card>
      <div className="mt-auto rounded-xl bg-primary py-2.5 text-center text-xs font-semibold text-black">
        {s.logSet}
      </div>
    </ScreenShell>
  );
}

export function NutritionScreen({ s }: { s: ScreenCopy }) {
  const meals = [
    { icon: Coffee, name: s.meals[0], kcal: 583, done: true },
    { icon: Sun, name: s.meals[1], kcal: 673, done: true },
    { icon: Moon, name: s.meals[2], kcal: 584, done: false },
    { icon: Apple, name: s.meals[3], kcal: 174, done: false },
  ];
  const macros = [
    { label: s.protein, value: 0.62 },
    { label: s.carbs, value: 0.48 },
    { label: s.fat, value: 0.4 },
  ];
  return (
    <ScreenShell>
      <p className="text-center font-semibold text-white">{s.today}</p>
      <Card className="flex items-center gap-3">
        <Ring value={0.52} size={70} stroke={7}>
          <span className="font-mono text-sm font-semibold text-primary">1,144</span>
          <span className="text-[8px] text-white/50">{s.remaining}</span>
        </Ring>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between">
            <span className="text-white/50">{s.target}</span>
            <span className="font-mono text-white">2,400</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">{s.eaten}</span>
            <span className="font-mono text-white">1,256</span>
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-2">
        {macros.map((macro) => (
          <Card key={macro.label} className="flex min-w-0 flex-col items-center gap-1 p-2">
            <Ring value={macro.value} size={30} stroke={4} />
            <span className="max-w-full truncate text-[9px] text-white/50">{macro.label}</span>
          </Card>
        ))}
      </div>
      <Card className="space-y-2">
        {meals.map((meal) => (
          <div key={meal.kcal} className="flex items-center gap-2">
            <meal.icon className="size-3.5 shrink-0 text-white/40" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-white">{meal.name}</span>
            <span className="font-mono text-white/50">{meal.kcal}</span>
            <Tick done={meal.done} size="sm" />
          </div>
        ))}
      </Card>
    </ScreenShell>
  );
}

export function ProgressScreen({ s }: { s: ScreenCopy }) {
  return (
    <ScreenShell>
      <p className="font-semibold text-white">{s.progress}</p>
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-white/60">{s.estimatedMax}</p>
          <TrendingUp className="size-3.5 text-primary" aria-hidden />
        </div>
        <p className="mt-1 font-mono text-xl font-semibold text-white">112 kg</p>
        <svg viewBox="0 0 200 70" className="mt-2 w-full" aria-hidden>
          <path
            d="M0 60 L25 55 L50 57 L75 44 L100 40 L125 31 L150 27 L175 16 L200 10"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="stroke-primary"
          />
        </svg>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <p className="text-white/50">{s.bodyWeight}</p>
          <p className="font-mono text-sm text-white">78.4 kg</p>
        </Card>
        <Card>
          <p className="text-white/50">{s.waist}</p>
          <p className="font-mono text-sm text-white">82 cm</p>
        </Card>
      </div>
      <Card>
        <p className="font-medium text-white">{s.weeklyCheckIn}</p>
        <p className="mt-1 text-white/50">{s.reviewed}</p>
      </Card>
    </ScreenShell>
  );
}
