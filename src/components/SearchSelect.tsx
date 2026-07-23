'use client';

import { useState, useEffect, useRef } from 'react';

interface Option {
  value: string | number;
  label: string;
}

interface SearchSelectProps {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  /** Quando true, aceita um valor digitado que não está na lista de opções
   * (comitado ao sair do campo), em vez de exigir que o usuário clique em
   * uma opção existente. Útil para campos de texto livre com sugestões,
   * como "Medida" — não afeta o uso padrão (seleção de um id existente). */
  allowCustom?: boolean;
}

export default function SearchSelect({
  label, value, onChange, options, placeholder = 'Selecione...', required, className = '', allowCustom = false
}: SearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const found = options.find(o => o.value == value);
      setSearch(found ? found.label : (allowCustom ? String(value) : ''));
    } else {
      setSearch('');
    }
  }, [value, options, allowCustom]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 50);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen) setIsOpen(true);
          if (e.target.value === '') onChange('');
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          if (!allowCustom) return;
          const found = options.find(o => o.label.toLowerCase() === search.toLowerCase());
          onChange(found ? found.value : search);
        }}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        autoComplete="off"
      />
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setSearch(option.label);
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition ${
                option.value == value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
              }`}
            >
              {option.label}
            </button>
          )) : (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">
              {search ? 'Nada encontrado' : 'Digite para buscar...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}