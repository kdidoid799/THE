import React from 'react';
import { X } from 'lucide-react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function FilterModal({ isOpen, onClose, title, children }: FilterModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* 模态框内容 */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">{children}</div>
      </div>
    </div>
  );
}

interface TagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

export function TagFilter({ availableTags, selectedTags, onToggleTag }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {availableTags.map((tag) => {
        const isSelected = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggleTag(tag)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

interface DurationFilterProps {
  selected: string;
  onSelect: (value: string) => void;
}

export function DurationFilter({ selected, onSelect }: DurationFilterProps) {
  const options = [
    { value: 'all', label: '全部时长' },
    { value: 'short', label: '1 小时内' },
    { value: 'medium', label: '1-2 小时' },
    { value: 'long', label: '2 小时以上' },
  ];

  return (
    <div className="space-y-2">
      {options.map((option) => {
        const isSelected = selected === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`w-full px-4 py-3 rounded-lg text-left font-medium transition-colors ${
              isSelected
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
