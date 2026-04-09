import React, { useState } from 'react';

export default function PatientSearchBar({
  value,
  onChange,
  onSearch,
  placeholder = '輸入病歷號碼 (Stay ID)...',
  buttonLabel = '搜尋',
  autoFocus = false,
  compact = false,
  showButton = true,
  className = '',
}) {
  const [internalValue, setInternalValue] = useState('');
  const isControlled = value !== undefined;
  const stayId = isControlled ? value : internalValue;

  const handleChange = (event) => {
    const nextValue = event.target.value.replace(/\D/g, '');

    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.(nextValue);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const normalizedStayId = stayId.trim();

    if (normalizedStayId) {
      onSearch?.(normalizedStayId);
    }
  };

  const containerClasses = compact ? 'w-full' : 'w-full max-w-md';
  const inputClasses = compact
    ? 'w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-300 placeholder:font-sans'
    : 'w-full pl-11 pr-20 py-2.5 bg-white border border-slate-300 rounded-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-mono';
  const iconClasses = compact ? 'absolute left-2.5 text-slate-400' : 'absolute left-4 text-slate-400';
  const iconSize = compact ? 'h-3.5 w-3.5' : 'h-5 w-5';
  const buttonClasses = compact
    ? 'absolute right-1.5 px-3 py-1 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md transition-colors'
    : 'absolute right-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-full transition-colors';

  return (
    <div className={[containerClasses, className].filter(Boolean).join(' ')}>
      <form onSubmit={handleSearch} className="relative flex items-center">
        <div className={iconClasses}>
          <svg xmlns="http://www.w3.org/2000/svg" className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <input
          type="text"
          value={stayId}
          onChange={handleChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={inputClasses}
        />

        {showButton && (
          <button
            type="submit"
            className={buttonClasses}
          >
            {buttonLabel}
          </button>
        )}
      </form>
    </div>
  );
}
