'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Generate Puzzles' },
  { href: '/puzzle-explorer', label: 'Puzzle Explorer' },
  { href: '/clue-editor', label: 'Clue Editor' },
];

interface AppHeaderProps {
  children?: React.ReactNode; // Extra items to render on the right (e.g. Islamic % badge)
}

export function AppHeader({ children }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-[#004d77]/60 backdrop-blur-md border-b border-[#4A90C2]/20">
      <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center gap-4 md:gap-6">
          {/* Logo + App Name */}
          <Link href="/" className="flex items-center gap-2 md:gap-3 shrink-0">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#b8952f] flex items-center justify-center shadow-lg">
              <span className="text-lg md:text-xl">&#9770;</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white text-base md:text-lg tracking-wide font-serif font-semibold leading-tight">
                Islamic Crosswords
              </h1>
              <p className="text-[#8fc1e3] text-[10px] md:text-xs tracking-widest uppercase">
                5x5 Puzzle Builder
              </p>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-1 md:gap-2" aria-label="Main navigation">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all',
                    isActive
                      ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                      : 'text-[#8fc1e3] hover:text-white hover:bg-[#002a42]/60 border border-transparent'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Extra items (Islamic % badge, etc.) */}
          {children}
        </div>
      </div>
    </header>
  );
}
