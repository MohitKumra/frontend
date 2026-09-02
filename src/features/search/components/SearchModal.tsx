import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckSquare, Flame, FileText, FolderKanban } from 'lucide-react';
import { DraggableModal } from '../../../components/ui/DraggableModal';
import { useSearch } from '../hooks/useSearch';
import type { SearchResult } from '../../../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getIconForType = (type: SearchResult['type']) => {
  switch (type) {
    case 'task':
      return <CheckSquare size={16} className="text-accent" />;
    case 'habit':
      return <Flame size={16} className="text-warning" />;
    case 'note':
      return <FileText size={16} className="text-info" />;
    case 'project':
      return <FolderKanban size={16} className="text-success" />;
    default:
      return <Search size={16} />;
  }
};

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useSearch(debouncedQuery);

  // Reset query and focus input when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setDebouncedQuery('');
      // Slight delay so the sheet entrance animation doesn't fight the
      // virtual keyboard appearing on mobile
      setTimeout(() => inputRef.current?.focus(), 180);
    }
  }, [isOpen]);

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'task':
        navigate(`/tasks/${result.id}`);
        break;
      case 'project':
        navigate(`/projects/${result.id}`);
        break;
      case 'note':
        if (result.metadata?.taskId) navigate(`/tasks/${result.metadata.taskId}`);
        else if (result.metadata?.projectId) navigate(`/projects/${result.metadata.projectId}`);
        else navigate('/notes');
        break;
      case 'habit':
        navigate('/habits');
        break;
      default:
        break;
    }
    onClose();
  };

  return (
    <DraggableModal isOpen={isOpen} onClose={onClose} title="Search">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tasks, habits, notes, projects..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border bg-transparent text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            style={{ borderColor: 'var(--color-border)' }}
          />
        </div>

        <div className="max-h-96 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="py-8 text-center text-text-muted text-sm">Searching...</div>
          ) : !results || results.length === 0 ? (
            query.trim().length > 0 ? (
              <div className="py-8 text-center text-text-muted text-sm">No results found</div>
            ) : (
              <div className="py-8 text-center text-text-muted text-sm">Start typing to search</div>
            )
          ) : (
            <div className="flex flex-col gap-1">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="flex items-start gap-3 p-3 rounded-xl text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <div className="mt-0.5 shrink-0">{getIconForType(result.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-text-primary truncate">{result.title}</div>
                    {result.description && <div className="text-sm text-text-muted truncate">{result.description}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </DraggableModal>
  );
}
