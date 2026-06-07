'use client';

import { useEffect, useRef, useState } from 'react';

interface LabelInputProps {
  currentLabel?: string | null;
  onSave: (label: string) => void;
  onCancel: () => void;
}

export function LabelInput({ currentLabel, onSave, onCancel }: LabelInputProps) {
  const [value, setValue] = useState(currentLabel ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed) onSave(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Label this path</p>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. wing, beak, body"
        maxLength={100}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label="Path label"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!value.trim()}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
