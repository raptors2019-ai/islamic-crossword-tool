'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type Difficulty = 'easy' | 'medium' | 'hard';

interface ClueOptions {
  easy: string[];
  medium: string[];
  hard: string[];
}

interface ClueOptionsPopoverProps {
  word: string;
  options: ClueOptions | undefined;
  selectedClues: { easy: string; medium: string; hard: string };
  isLoading: boolean;
  onSelectClue: (difficulty: Difficulty, clue: string) => void;
  onGenerate: () => void;
  children: React.ReactNode;
}

export function ClueOptionsPopover({
  word,
  options,
  selectedClues,
  isLoading,
  onSelectClue,
  onGenerate,
  children,
}: ClueOptionsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Difficulty>('easy');
  const hasTriggeredGenerate = useRef(false);

  const hasOptions = options && (
    options.easy.length > 0 ||
    options.medium.length > 0 ||
    options.hard.length > 0
  );

  // Auto-generate when popover opens and no options exist
  useEffect(() => {
    if (open && !hasOptions && !isLoading && !hasTriggeredGenerate.current) {
      console.log('[ClueOptionsPopover] Auto-generating for:', word);
      hasTriggeredGenerate.current = true;
      onGenerate();
    }
    // Reset the flag when popover closes
    if (!open) {
      hasTriggeredGenerate.current = false;
    }
  }, [open, hasOptions, isLoading, onGenerate, word]);

  const handleSelectClue = (difficulty: Difficulty, clue: string) => {
    onSelectClue(difficulty, clue);
    setOpen(false);
  };

  const difficultyColors: Record<Difficulty, { bg: string; border: string; text: string; activeBg: string }> = {
    easy: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      activeBg: 'bg-green-500/20',
    },
    medium: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      activeBg: 'bg-amber-500/20',
    },
    hard: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      activeBg: 'bg-red-500/20',
    },
  };

  const renderClueOptions = (difficulty: Difficulty) => {
    // Ensure clueList is always an array (handle string fallback from old API format)
    const rawList = options?.[difficulty];
    const clueList = Array.isArray(rawList) ? rawList : (rawList ? [rawList] : []);
    const selectedClue = selectedClues[difficulty];
    const colors = difficultyColors[difficulty];

    console.log('[renderClueOptions]', difficulty, 'rawList:', rawList, 'clueList:', clueList);

    if (clueList.length === 0) {
      return (
        <div className="py-4 text-center text-[#6ba8d4] text-sm">
          No {difficulty} clues generated yet
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {clueList.map((clue, index) => {
          const isSelected = selectedClue === clue;
          return (
            <button
              key={index}
              onClick={() => handleSelectClue(difficulty, clue)}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-lg transition-all border',
                'flex items-start gap-2 group',
                isSelected
                  ? `${colors.activeBg} ${colors.border} ${colors.text}`
                  : 'bg-[#001a2c]/40 border-transparent hover:border-[#4A90C2]/30 text-[#c0d8e8]'
              )}
            >
              {/* Radio indicator */}
              <div className={cn(
                'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center',
                isSelected ? colors.border : 'border-[#4A90C2]/40'
              )}>
                {isSelected && (
                  <div className={cn('w-2 h-2 rounded-full', colors.text.replace('text-', 'bg-'))} />
                )}
              </div>
              <span className="text-sm leading-snug">{clue}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      console.log('[ClueOptionsPopover] open changed to:', isOpen, 'for word:', word);
      setOpen(isOpen);
    }}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 bg-[#002a42] border-[#4A90C2]/30 shadow-xl z-[100]"
        align="end"
        sideOffset={5}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#4A90C2]/20">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-[#D4AF37] font-semibold text-sm">AI Clues</h4>
              <p className="text-[#8fc1e3] text-xs mt-0.5">
                {word} &middot; Select a clue option
              </p>
            </div>
            <button
              onClick={() => {
                onGenerate();
              }}
              disabled={isLoading}
              className={cn(
                'px-2.5 py-1.5 rounded text-xs transition-all flex items-center gap-1.5',
                isLoading
                  ? 'bg-violet-500/20 text-violet-400 cursor-wait'
                  : 'bg-[#4A90C2]/20 text-[#8fc1e3] hover:bg-[#4A90C2]/30 hover:text-white'
              )}
            >
              {isLoading ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {hasOptions ? 'Regenerate' : 'Generate'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading && !hasOptions ? (
          <div className="px-4 py-8 text-center">
            <svg className="w-8 h-8 mx-auto mb-3 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-[#8fc1e3] text-sm">Generating clue options...</p>
            <p className="text-[#6ba8d4] text-xs mt-1">3 options per difficulty level</p>
          </div>
        ) : !hasOptions ? (
          <div className="px-4 py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-[#001a2c]/40 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#6ba8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <p className="text-[#8fc1e3] text-sm">No clues generated yet</p>
            <p className="text-[#6ba8d4] text-xs mt-1">Click Generate to create AI clues</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Difficulty)} className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-[#001a2c]/60 rounded-none border-b border-[#4A90C2]/20 p-0 h-auto">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => {
                const colors = difficultyColors[diff];
                const count = options?.[diff]?.length || 0;
                return (
                  <TabsTrigger
                    key={diff}
                    value={diff}
                    className={cn(
                      'py-2.5 px-3 rounded-none border-b-2 border-transparent transition-all',
                      'data-[state=active]:border-current data-[state=active]:bg-transparent',
                      'text-xs uppercase tracking-wider font-medium',
                      activeTab === diff ? colors.text : 'text-[#6ba8d4] hover:text-[#8fc1e3]'
                    )}
                  >
                    {diff}
                    {count > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-current/20 text-[10px]">
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <div className="p-3 max-h-60 overflow-y-auto">
              <TabsContent value="easy" className="mt-0">
                {renderClueOptions('easy')}
              </TabsContent>
              <TabsContent value="medium" className="mt-0">
                {renderClueOptions('medium')}
              </TabsContent>
              <TabsContent value="hard" className="mt-0">
                {renderClueOptions('hard')}
              </TabsContent>
            </div>
          </Tabs>
        )}
      </PopoverContent>
    </Popover>
  );
}
