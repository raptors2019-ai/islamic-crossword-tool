'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CrosswordGrid } from '@/components/crossword-grid';
import { WordBank } from '@/components/word-bank';
import { ClueEditor } from '@/components/clue-editor';
import { CluesPanel } from '@/components/clues-panel';
import { QuestionCallout } from '@/components/question-callout';
import { sampleWords, generateSamplePuzzle } from '@/lib/sample-data';
import { Word } from '@/lib/types';

export default function Home() {
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [usedWordIds] = useState(new Set(['1', '3', '5', '9']));
  const puzzle = generateSamplePuzzle();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🕌</span>
              <div>
                <h1 className="text-xl font-bold">Islamic Crossword Builder</h1>
                <p className="text-sm opacity-90">Mockups for myislam.org</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              MOCKUP MODE
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="builder" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="builder">Visual Builder</TabsTrigger>
            <TabsTrigger value="clues">Clue Helper</TabsTrigger>
            <TabsTrigger value="words">Word Lists</TabsTrigger>
            <TabsTrigger value="quick">Quick Generate</TabsTrigger>
          </TabsList>

          {/* Tab 1: Visual Builder */}
          <TabsContent value="builder" className="space-y-4">
            <QuestionCallout
              questions={[
                'Does he prefer dragging words onto the grid, or auto-generating and then tweaking?',
                'How important is seeing the grid build up visually vs. just getting a finished puzzle?',
                'Does he need to manually place words or just approve/reject generated placements?',
              ]}
            />

            <div className="grid grid-cols-[280px_1fr_300px] gap-4">
              {/* Word Bank */}
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Word Bank
                    <Badge variant="outline">{sampleWords.length} words</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <WordBank
                    words={sampleWords}
                    usedWordIds={usedWordIds}
                    onWordSelect={setSelectedWord}
                    selectedWordId={selectedWord?.id}
                  />
                </CardContent>
              </Card>

              {/* Grid */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Puzzle Grid</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        ↶ Undo
                      </Button>
                      <Button variant="outline" size="sm">
                        Auto-Fill
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <CrosswordGrid grid={puzzle.grid} interactive />

                  <div className="flex gap-2">
                    <Button>✨ Generate Puzzle</Button>
                    <Button variant="outline">🔄 Shuffle</Button>
                    <Button variant="destructive">🗑️ Clear All</Button>
                  </div>

                  <div className="flex items-center gap-6 text-sm bg-muted/50 rounded-lg px-4 py-2 w-full justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>4 words placed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>All intersections valid</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span>3 more words recommended</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Clues */}
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Clues</CardTitle>
                    <Button variant="outline" size="sm">
                      Edit All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <CluesPanel
                    placedWords={puzzle.placedWords}
                    onEditClue={(pw) => setEditingWord(pw.word)}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Clue Helper */}
          <TabsContent value="clues" className="space-y-4">
            <QuestionCallout
              variant="blue"
              questions={[
                'How does he currently write clues? Does he use the definitions from the word list or write custom ones?',
                'For Arabic words with multiple transliterations (QURAN/KORAN, MUSA/MOSES), which spellings does he prefer?',
                'Would AI-suggested clues be helpful, or does he want full control?',
                'Does he need different difficulty levels for different audiences?',
              ]}
            />

            <div className="grid grid-cols-2 gap-6">
              {/* Single Word Editor */}
              <Card>
                <CardHeader>
                  <CardTitle>Edit Single Word</CardTitle>
                </CardHeader>
                <CardContent>
                  <ClueEditor
                    word={sampleWords[7]} // ZAKARIYA
                    onSave={(clue, spelling) => {
                      console.log('Saved:', clue, spelling);
                    }}
                  />
                </CardContent>
              </Card>

              {/* Bulk Editor Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Clue Editor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {puzzle.placedWords.map((pw, i) => (
                      <div
                        key={pw.number}
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                      >
                        <span className="font-bold text-primary min-w-[80px]">
                          {pw.word.word}
                        </span>
                        <Input
                          defaultValue={pw.word.clue}
                          className="flex-1"
                        />
                        <Badge
                          variant={i === 3 ? 'destructive' : i === 2 ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {i === 3 ? '✗ Missing' : i === 2 ? '⚠️ Short' : '✓ Good'}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          ✨
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button>💾 Save All</Button>
                    <Button variant="outline">✨ Auto-fill Missing</Button>
                    <Button variant="outline">📋 Import CSV</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 3: Word Lists */}
          <TabsContent value="words" className="space-y-4">
            <QuestionCallout
              variant="green"
              questions={[
                'Does he maintain multiple word lists for different themes?',
                'How does he handle spelling variants for Arabic transliterations?',
                'Does he need to import/export word lists?',
                'Should words be scored or categorized for puzzle difficulty?',
              ]}
            />

            <div className="grid grid-cols-3 gap-4">
              <Card className="col-span-2 h-[500px]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Word List Manager</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        📤 Export
                      </Button>
                      <Button variant="outline" size="sm">
                        📥 Import
                      </Button>
                      <Button size="sm">+ Add Word</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="overflow-y-auto h-[400px]">
                  <div className="space-y-2">
                    {sampleWords.map((word) => (
                      <div
                        key={word.id}
                        className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="w-24">
                          <div className="font-bold text-primary">{word.word}</div>
                          {word.arabicScript && (
                            <div className="text-sm text-muted-foreground">
                              {word.arabicScript}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm">{word.clue}</div>
                          {word.spellingVariants && word.spellingVariants.length > 1 && (
                            <div className="flex gap-1 mt-1">
                              {word.spellingVariants.map((v) => (
                                <span
                                  key={v}
                                  className="text-xs bg-muted px-1.5 py-0.5 rounded"
                                >
                                  {v}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline">{word.category}</Badge>
                        <Button variant="ghost" size="sm">
                          ✏️
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Spelling Variants</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Arabic words can have multiple valid English transliterations.
                    Mark which spellings are acceptable.
                  </p>

                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <div className="font-bold text-primary mb-2">QURAN</div>
                      <div className="flex flex-wrap gap-1">
                        <Badge>QURAN ✓</Badge>
                        <Badge variant="outline">KORAN</Badge>
                        <Badge variant="outline">QORAN</Badge>
                        <Badge variant="secondary" className="border-dashed">
                          + Add
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="font-bold text-primary mb-2">MUSA</div>
                      <div className="flex flex-wrap gap-1">
                        <Badge>MUSA ✓</Badge>
                        <Badge variant="outline">MOSES</Badge>
                        <Badge variant="outline">MOUSA</Badge>
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="font-bold text-primary mb-2">RAMADAN</div>
                      <div className="flex flex-wrap gap-1">
                        <Badge>RAMADAN ✓</Badge>
                        <Badge variant="outline">RAMADHAN</Badge>
                        <Badge variant="outline">RAMAZAN</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 4: Quick Generate */}
          <TabsContent value="quick" className="space-y-4">
            <QuestionCallout
              questions={[
                "What's his ideal workflow - generate one at a time or batch generate?",
                'Does he want to pick a theme first, or just generate random Islamic puzzles?',
                'How does he currently get puzzles onto the website? What format?',
                'Does he need print-friendly versions too?',
              ]}
            />

            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Generate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Theme</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'All Islamic', value: 'all' },
                        { label: 'Names of Allah', value: 'names' },
                        { label: 'Prophet Stories', value: 'prophets' },
                        { label: 'Ramadan', value: 'ramadan' },
                      ].map((theme) => (
                        <Button
                          key={theme.value}
                          variant={theme.value === 'all' ? 'default' : 'outline'}
                          className="justify-start"
                        >
                          {theme.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Number of Words
                    </label>
                    <div className="flex gap-2">
                      {[5, 7, 10, 12].map((n) => (
                        <Button
                          key={n}
                          variant={n === 7 ? 'default' : 'outline'}
                          size="sm"
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Puzzle Title
                    </label>
                    <Input placeholder="Islamic Crossword #1" />
                  </div>

                  <Separator />

                  <Button className="w-full" size="lg">
                    ✨ Generate Puzzle
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Batch Generate for Ramadan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Generate a full month of puzzles at once - one for each day of Ramadan.
                  </p>

                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Puzzles to generate:</span>
                      <span className="font-bold">30</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Words per puzzle:</span>
                      <span className="font-bold">7</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Theme:</span>
                      <span className="font-bold">Mixed Islamic</span>
                    </div>
                  </div>

                  <Button className="w-full" size="lg" variant="secondary">
                    📅 Generate 30 Ramadan Puzzles
                  </Button>

                  <Separator />

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Export Format
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button variant="outline" size="sm">
                        JSON
                      </Button>
                      <Button variant="outline" size="sm">
                        HTML
                      </Button>
                      <Button variant="outline" size="sm">
                        Print PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Preview Generated Puzzle</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-8 items-start">
                  <CrosswordGrid grid={puzzle.grid} />
                  <div className="flex-1">
                    <CluesPanel placedWords={puzzle.placedWords} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button>📤 Export JSON</Button>
                    <Button variant="outline">🖨️ Print</Button>
                    <Button variant="outline">📋 Copy HTML</Button>
                    <Button variant="outline">💾 Save Draft</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingWord} onOpenChange={() => setEditingWord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Clue: {editingWord?.word}</DialogTitle>
          </DialogHeader>
          {editingWord && (
            <ClueEditor
              word={editingWord}
              onSave={() => setEditingWord(null)}
              onCancel={() => setEditingWord(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
