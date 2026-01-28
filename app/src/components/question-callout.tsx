'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuestionCalloutProps {
  questions: string[];
  variant?: 'orange' | 'blue' | 'green';
}

export function QuestionCallout({ questions, variant = 'orange' }: QuestionCalloutProps) {
  const colors = {
    orange: 'bg-orange-50 border-l-orange-400 text-orange-900',
    blue: 'bg-blue-50 border-l-blue-400 text-blue-900',
    green: 'bg-green-50 border-l-green-400 text-green-900',
  };

  const headerColors = {
    orange: 'text-orange-700',
    blue: 'text-blue-700',
    green: 'text-green-700',
  };

  return (
    <Card className={`border-l-4 ${colors[variant]}`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-semibold ${headerColors[variant]}`}>
          💬 Questions for Azmat
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-sm space-y-1">
          {questions.map((q, i) => (
            <li key={i}>• {q}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
