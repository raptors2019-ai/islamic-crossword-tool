'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ThemeOption {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

const defaultThemes: ThemeOption[] = [
  { id: 'prophets', name: 'Prophet Stories', description: 'Stories of the messengers', icon: '📖' },
  { id: 'ramadan', name: 'Ramadan', description: 'Fasting, prayers, spiritual growth', icon: '🌙' },
  { id: 'names', name: '99 Names of Allah', description: 'Beautiful names of Allah', icon: '✨' },
  { id: 'pillars', name: '5 Pillars', description: 'Foundations of Islam', icon: '🕌' },
  { id: 'quran', name: 'Quran', description: 'The Holy Book', icon: '📚' },
  { id: 'companions', name: 'Companions', description: 'Sahaba of the Prophet', icon: '👥' },
  { id: 'general', name: 'General Islamic', description: 'Mix of Islamic terms', icon: '☪️' },
];

interface ThemeSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  themes?: ThemeOption[];
  className?: string;
  placeholder?: string;
}

export function ThemeSelector({
  value,
  onValueChange,
  themes = defaultThemes,
  className,
  placeholder = 'Select theme',
}: ThemeSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {themes.map((theme) => (
          <SelectItem key={theme.id} value={theme.id}>
            <div className="flex items-center gap-2">
              {theme.icon && <span>{theme.icon}</span>}
              <span>{theme.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { defaultThemes };
