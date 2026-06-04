import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  compact?: boolean; // For smaller inline selects (e.g. unit pickers)
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  required = false,
  className = '',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hidden native input for form validation (required)
  return (
    <div ref={ref} className={`relative ${className}`}>
      {required && (
        <input
          tabIndex={-1}
          className="absolute opacity-0 w-full h-full pointer-events-none"
          value={value}
          required
          onChange={() => {}}
        />
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-left transition-all
          ${compact
            ? 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400'
            : 'rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white px-4 py-3.5 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
          }
        `}
      >
        <span className={!value && !compact ? 'text-gray-400 dark:text-gray-500' : ''}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={compact ? 12 : 16}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className={`absolute z-50 mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150
          ${compact ? 'max-h-40' : 'max-h-64'} overflow-y-auto
        `}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 text-left transition-colors
                ${compact ? 'py-2 text-xs' : 'py-3 text-sm'}
                ${option.value === value
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }
              `}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={14} className="text-blue-500 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
