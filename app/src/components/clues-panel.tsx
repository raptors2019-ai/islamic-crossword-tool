'use client';

import { PlacedWord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface CluesPanelProps {
  placedWords: PlacedWord[];
  onEditClue?: (word: PlacedWord) => void;
  selectedWordNumber?: number | null;
  onClueClick?: (word: PlacedWord) => void;
}

export function CluesPanel({
  placedWords,
  onEditClue,
  selectedWordNumber,
  onClueClick,
}: CluesPanelProps) {
  const acrossWords = placedWords
    .filter((pw) => pw.direction === 'across')
    .sort((a, b) => a.number - b.number);

  const downWords = placedWords
    .filter((pw) => pw.direction === 'down')
    .sort((a, b) => a.number - b.number);

  const ClueItem = ({ word }: { word: PlacedWord }) => (
    <div
      onClick={() => onClueClick?.(word)}
      className={cn(
        'flex items-start gap-2 p-2 rounded-md transition-colors cursor-pointer',
        selectedWordNumber === word.number
          ? 'bg-primary/10'
          : 'hover:bg-muted/50'
      )}
    >
      <span className="font-bold text-primary min-w-[24px]">{word.number}.</span>
      <span className="flex-1 text-sm">{word.word.clue}</span>
      {onEditClue && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onEditClue(word);
          }}
        >
          ✏️
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm text-primary mb-2 pb-2 border-b-2 border-primary/20">
          ACROSS
        </h3>
        <div className="space-y-1">
          {acrossWords.map((word) => (
            <ClueItem key={`across-${word.number}`} word={word} />
          ))}
          {acrossWords.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No across clues yet</p>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-semibold text-sm text-primary mb-2 pb-2 border-b-2 border-primary/20">
          DOWN
        </h3>
        <div className="space-y-1">
          {downWords.map((word) => (
            <ClueItem key={`down-${word.number}`} word={word} />
          ))}
          {downWords.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No down clues yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
