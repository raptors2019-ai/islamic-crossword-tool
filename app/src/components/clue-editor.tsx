'use client';

import { useState } from 'react';
import { Word, Difficulty } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { aiClueSuggestions } from '@/lib/sample-data';

interface ClueEditorProps {
  word: Word;
  onSave?: (clue: string, primarySpelling: string) => void;
  onCancel?: () => void;
}

export function ClueEditor({ word, onSave, onCancel }: ClueEditorProps) {
  const [clue, setClue] = useState(word.clue);
  const [primarySpelling, setPrimarySpelling] = useState(word.word);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateMore = () => {
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => setIsGenerating(false), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Word Display */}
      <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
        {word.arabicScript && (
          <div className="text-4xl text-primary mb-2">{word.arabicScript}</div>
        )}
        <div className="text-3xl font-bold text-primary tracking-wider">
          {primarySpelling}
        </div>
      </div>

      {/* Spelling Variants */}
      {word.spellingVariants && word.spellingVariants.length > 1 && (
        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">
            Accepted Spellings (click to set primary)
          </Label>
          <div className="flex flex-wrap gap-2">
            {word.spellingVariants.map((variant) => (
              <Badge
                key={variant}
                variant={variant === primarySpelling ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer transition-all',
                  variant === primarySpelling
                    ? ''
                    : 'hover:bg-primary/10 hover:border-primary'
                )}
                onClick={() => setPrimarySpelling(variant)}
              >
                {variant}
              </Badge>
            ))}
            <Badge
              variant="outline"
              className="cursor-pointer border-dashed text-muted-foreground hover:bg-muted"
            >
              + Add spelling
            </Badge>
          </div>
        </div>
      )}

      <Separator />

      {/* Clue Editor */}
      <div>
        <Label htmlFor="clue" className="text-sm font-medium mb-2 block">
          Clue
        </Label>
        <Textarea
          id="clue"
          value={clue}
          onChange={(e) => setClue(e.target.value)}
          className="min-h-[80px] text-base"
          placeholder="Enter clue for this word..."
        />
      </div>

      {/* Difficulty Selector */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Clue Difficulty</Label>
        <div className="grid grid-cols-3 gap-2">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={cn(
                'p-3 rounded-lg border-2 text-center transition-all',
                difficulty === level
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="font-medium capitalize">{level}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {level === 'easy' && 'Direct definition'}
                {level === 'medium' && 'Some context needed'}
                {level === 'hard' && 'Requires knowledge'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* AI Suggestions */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs">
              AI
            </Badge>
            Suggested Clues
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {aiClueSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setClue(suggestion.text)}
              className="w-full text-left p-3 bg-background rounded-lg border border-transparent hover:border-violet-300 transition-colors"
            >
              <div className="text-sm">{suggestion.text}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {suggestion.type}
              </div>
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={handleGenerateMore}
            disabled={isGenerating}
          >
            {isGenerating ? '✨ Generating...' : '⟳ Generate More'}
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" onClick={() => onSave?.(clue, primarySpelling)}>
          💾 Save Changes
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
