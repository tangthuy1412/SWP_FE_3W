import React from 'react';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearchChange?: (value: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  className = '',
  placeholder = 'Search files, folders, or ask AI...',
  onSearchChange,
  onChange,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e);
    if (onSearchChange) onSearchChange(e.target.value);
  };

  return (
    <div className="relative w-full transition-shadow rounded-xl">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary select-none">
        search
      </span>
      <input
        type="text"
        className={`w-full h-11 pl-10 pr-4 bg-surface border border-outline-variant focus:border-primary/30 rounded-xl font-body-md text-body-md text-on-surface placeholder:text-secondary focus:ring-2 focus:ring-primary/10 outline-none transition-all shadow-[0_2px_12px_rgba(35,48,38,0.03)] ${className}`}
        placeholder={placeholder}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
};
export default SearchInput;
