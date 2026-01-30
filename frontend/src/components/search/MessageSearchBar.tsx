import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchStore } from '@/stores/searchStore';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageSearchBarProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function MessageSearchBar({
  className,
  placeholder = 'Search messages...',
  autoFocus = false,
}: MessageSearchBarProps) {
  const [inputValue, setInputValue] = useState('');
  const { query, isSearching, setQuery, search, clearSearch } = useSearchStore();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== query) {
        setQuery(inputValue);
        if (inputValue.trim().length >= 2) {
          search();
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, query, setQuery, search]);

  const handleClear = useCallback(() => {
    setInputValue('');
    clearSearch();
  }, [clearSearch]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
        autoFocus={autoFocus}
      />
      {isSearching ? (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      ) : inputValue && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={handleClear}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
