'use client';

import { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: number;
  originalValue: number;
  onChange: (value: number) => void;
  className?: string;
  formatFn?: (value: number) => string;
}

export function EditableCell({ value, originalValue, onChange, className, formatFn }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const isEdited = value !== originalValue;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => { setInputValue(String(value)); }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) { onChange(parsed); } else { setInputValue(String(value)); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') { setInputValue(String(value)); setIsEditing(false); }
  };

  const defaultFormat = (v: number) => v.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
  const format = formatFn || defaultFormat;

  if (isEditing) {
    return (
      <Input ref={inputRef} type="number" step="0.01" value={inputValue}
        onChange={(e) => setInputValue(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown}
        className={cn('w-32 h-8 text-right text-sm', className)} />
    );
  }

  return (
    <button type="button" onClick={() => setIsEditing(true)}
      className={cn('flex items-center gap-1 text-right cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors',
        isEdited && 'text-orange-600 font-medium', className)}
      title={isEdited ? `Orijinal: ${format(originalValue)}` : 'Düzenlemek için tıklayın'}>
      <span>{format(value)}</span>
      {isEdited && <Pencil className="h-3 w-3 text-orange-500 flex-shrink-0" />}
    </button>
  );
}
