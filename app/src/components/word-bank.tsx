'use client';

import { useState } from 'react';
import { Word } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WordBankProps {
  words: Word[];
  usedWordIds?: Set<string>;
  onWordSelect?: (word: Word) => void;
  selectedWordId?: string | null;
}

export function WordBank({
  words,
  usedWordIds = new Set(),
  onWordSelect,
  selectedWordId,
}: WordBankProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filteredWords = words.filter((word) => {
    const matchesSearch =
      word.word.toLowerCase().includes(search.toLowerCase()) ||
      word.clue.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || word.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(words.map((w) => w.category).filter(Boolean))];

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <Input
          placeholder="Search words..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9"
        />
        <div className="flex flex-wrap gap-1">
          <Badge
            variant={categoryFilter === null ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setCategoryFilter(null)}
          >
            All
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={categoryFilter === cat ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setCategoryFilter(cat || null)}
            >
              {cat?.replace('-', ' ')}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredWords.map((word) => {
          const isUsed = usedWordIds.has(word.id);
          const isSelected = selectedWordId === word.id;

          return (
            <Card
              key={word.id}
              onClick={() => !isUsed && onWordSelect?.(word)}
              className={cn(
                'p-3 cursor-pointer transition-all',
                isUsed && 'opacity-50 cursor-not-allowed',
                isSelected && 'ring-2 ring-primary',
                !isUsed && 'hover:shadow-md hover:border-primary/50'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">{word.word}</span>
                    {word.arabicScript && (
                      <span className="text-muted-foreground text-sm">
                        {word.arabicScript}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {word.clue}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {word.word.length} letters
                  </Badge>
                  {isUsed && (
                    <Badge variant="outline" className="text-xs text-blue-600">
                      ✓ Used
                    </Badge>
                  )}
                </div>
              </div>
              {word.spellingVariants && word.spellingVariants.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {word.spellingVariants.slice(1).map((variant) => (
                    <span
                      key={variant}
                      className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                    >
                      {variant}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
