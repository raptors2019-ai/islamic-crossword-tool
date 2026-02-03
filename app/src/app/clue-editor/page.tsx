import Link from 'next/link';
import { StandaloneClueEditor } from '@/components/standalone-clue-editor';

export default function ClueEditorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001a2c] via-[#003B5C] to-[#002a42]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#004d77]/60 backdrop-blur-md border-b border-[#4A90C2]/20">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#b8952f] flex items-center justify-center shadow-lg">
                <span className="text-xl">☪</span>
              </div>
              <div>
                <h1 className="text-white text-lg tracking-wide font-serif font-semibold">
                  Clue Editor
                </h1>
                <p className="text-[#8fc1e3] text-xs tracking-widest uppercase">
                  AI-Powered Clue Generator
                </p>
              </div>
            </div>

            {/* Back to Builder Link */}
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#002a42]/80 border border-[#4A90C2]/30 text-[#8fc1e3] hover:text-white hover:border-[#D4AF37]/50 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Back to Builder</span>
              <span className="sm:hidden">Builder</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-2xl">
        <div className="mb-6">
          <p className="text-[#8fc1e3] text-sm">
            Generate AI clues for any words. Enter words below, one per line or comma-separated,
            then click Generate to get clue options at Easy, Medium, and Hard difficulty levels.
          </p>
        </div>

        <StandaloneClueEditor />
      </main>
    </div>
  );
}
