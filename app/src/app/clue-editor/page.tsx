import { StandaloneClueEditor } from '@/components/standalone-clue-editor';
import { AppHeader } from '@/components/app-header';

export default function ClueEditorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001a2c] via-[#003B5C] to-[#002a42]">
      <AppHeader />

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
