import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type PropsWithChildren,
  type TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/lib/utils';

export function ScreenFrame({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <main
      className={cn(
        'mx-auto flex min-h-dvh w-full max-w-screen-sm flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1rem)]',
        className,
      )}
    >
      {children}
    </main>
  );
}

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={cn(
        'rounded-[1.75rem] border border-border/70 bg-card/90 p-4 shadow-[0_18px_60px_-35px_rgba(15,23,42,0.55)] backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-5 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">{eyebrow}</p>
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="max-w-prose text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </header>
  );
}

export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55',
        variant === 'primary' &&
          'bg-primary text-primary-foreground shadow-[0_14px_32px_-18px_rgba(17,92,64,0.85)] hover:brightness-105',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        variant === 'ghost' && 'bg-transparent text-foreground hover:bg-accent/10',
        variant === 'danger' && 'bg-destructive/12 text-destructive hover:bg-destructive/18',
        className,
      )}
      {...props}
    />
  );
}

export function PillButton({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-[1.1rem] border px-4 py-3 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border/80 bg-background/65 text-foreground hover:border-primary/40 hover:bg-accent/5',
        className,
      )}
      {...props}
    />
  );
}

export function ToggleRow({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-[1.4rem] border px-4 py-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-primary bg-primary/10'
          : 'border-border/70 bg-background/50 hover:border-primary/40',
      )}
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      <span
        aria-hidden
        className={cn('h-6 w-11 rounded-full p-1 transition', active ? 'bg-primary' : 'bg-muted')}
      >
        <span
          className={cn(
            'block h-4 w-4 rounded-full bg-white transition',
            active ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </span>
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: PropsWithChildren<{ label: string; hint?: string }>) {
  return (
    <label className="block space-y-2">
      <div className="space-y-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </label>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'min-h-12 w-full rounded-[1rem] border border-border/80 bg-background/75 px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        {...props}
      />
    );
  },
);

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-24 w-full rounded-[1rem] border border-border/80 bg-background/75 px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    />
  );
});

export function ProgressBar({ value, max = 1 }: { value: number; max?: number }) {
  const width = `${Math.max(0, Math.min((value / max) * 100, 100))}%`;

  return (
    <div className="h-3 rounded-full bg-secondary/80">
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width }}
      />
    </div>
  );
}
