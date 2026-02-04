'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useVisibilityRefresh } from '@/hooks/useRealTimeData';

interface MemoryFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  category?: 'daily' | 'chat' | 'knowledge' | 'archive' | 'other';
}

interface SearchResult {
  file: string;
  path: string;
  matches: {
    line: number;
    text: string;
    context: string;
  }[];
  category: 'daily' | 'chat' | 'knowledge' | 'other';
  modified: string;
}

interface MemoryPanelProps {
  onFileSelect?: (path: string, content: string) => void;
}

export default function MemoryPanel({ onFileSelect }: MemoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'browse' | 'daily' | 'chat'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [dailyNotes, setDailyNotes] = useState<MemoryFile[]>([]);
  const [currentDir, setCurrentDir] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Track mounted state for hydration-safe date formatting
  useEffect(() => {
    setMounted(true);
  }, []);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load memory files
  const loadFiles = useCallback(async (dir: string = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dir) params.set('dir', dir);
      
      const res = await fetch(`/api/memory/files?${params.toString()}`);
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setFiles(data.files || []);
        if (data.dailyNotes) {
          setDailyNotes(data.dailyNotes);
        }
        setCurrentDir(data.currentDir || '/');
      }
    } catch (err) {
      setError('Failed to load memory files');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh memory files when page becomes visible or gains focus
  useVisibilityRefresh(loadFiles);

  // Load file content
  const loadFileContent = useCallback(async (filePath: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/memory/files?file=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setSelectedFile({ path: filePath, content: data.content });
        onFileSelect?.(filePath, data.content);
      }
    } catch (err) {
      setError('Failed to load file');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [onFileSelect]);

  // Search with debounce
  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const res = await fetch(`/api/memory/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setSearchResults(data.results || []);
      }
    } catch (err) {
      setError('Search failed');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (searchQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, handleSearch]);

  // Initial load
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleFileClick = (file: MemoryFile) => {
    if (file.type === 'directory') {
      loadFiles(file.path);
    } else {
      loadFileContent(file.path);
    }
  };

  const navigateUp = () => {
    if (currentDir && currentDir !== '/') {
      const parts = currentDir.split('/');
      parts.pop();
      loadFiles(parts.join('/'));
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'daily': return '📅';
      case 'chat': return '💬';
      case 'knowledge': return '📚';
      case 'archive': return '🗄️';
      default: return '📄';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString || !mounted) return '...';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Highlight search matches
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark style="background: rgba(102, 126, 234, 0.4); color: #fff; padding: 0 2px; border-radius: 2px;">$1</mark>');
  };

  return (
    <div style={styles.container}>
      {/* Tab Navigation */}
      <div style={styles.tabBar}>
        {(['search', 'browse', 'daily', 'chat'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {}),
            }}
          >
            {tab === 'search' && '🔍 Search'}
            {tab === 'browse' && '📁 Browse'}
            {tab === 'daily' && '📅 Daily'}
            {tab === 'chat' && '💬 Chat'}
          </button>
        ))}
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div style={styles.tabContent}>
          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {isSearching && <span style={styles.searchSpinner}>⏳</span>}
          </div>
          
          {searchResults.length > 0 && (
            <div style={styles.resultCount}>
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </div>
          )}
          
          <div style={styles.searchResults}>
            {searchResults.map((result, i) => (
              <div
                key={i}
                style={styles.searchResult}
                onClick={() => loadFileContent(result.path)}
              >
                <div style={styles.resultHeader}>
                  <span style={styles.resultIcon}>{getCategoryIcon(result.category)}</span>
                  <span style={styles.resultFile}>{result.file}</span>
                  <span style={styles.resultMeta}>{formatDate(result.modified)}</span>
                </div>
                <div style={styles.resultMatches}>
                  {result.matches.slice(0, 2).map((match, j) => (
                    <div key={j} style={styles.matchItem}>
                      <span style={styles.lineNumber}>:{match.line}</span>
                      <span 
                        style={styles.matchText}
                        dangerouslySetInnerHTML={{ 
                          __html: highlightMatch(match.text, searchQuery) 
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <div style={styles.noResults}>No results found for "{searchQuery}"</div>
            )}
          </div>
        </div>
      )}

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div style={styles.tabContent}>
          <div style={styles.breadcrumb}>
            <button 
              onClick={() => loadFiles('')}
              style={styles.breadcrumbItem}
            >
              🏠 memory
            </button>
            {currentDir && currentDir !== '/' && currentDir.split('/').map((part, i, arr) => (
              <span key={i}>
                <span style={styles.breadcrumbSep}>/</span>
                <button
                  onClick={() => loadFiles(arr.slice(0, i + 1).join('/'))}
                  style={styles.breadcrumbItem}
                >
                  {part}
                </button>
              </span>
            ))}
          </div>
          
          {currentDir && currentDir !== '/' && (
            <button onClick={navigateUp} style={styles.upButton}>
              ⬆️ Parent Directory
            </button>
          )}
          
          {isLoading && <div style={styles.loading}>Loading...</div>}
          
          <div style={styles.fileList}>
            {files.map((file, i) => (
              <div
                key={i}
                onClick={() => handleFileClick(file)}
                style={styles.fileItem}
              >
                <span style={styles.fileIcon}>
                  {file.type === 'directory' ? '📁' : getCategoryIcon(file.category)}
                </span>
                <span style={styles.fileName}>{file.name}</span>
                <span style={styles.fileMeta}>
                  {file.type === 'file' && formatFileSize(file.size)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Notes Tab */}
      {activeTab === 'daily' && (
        <div style={styles.tabContent}>
          <h3 style={styles.sectionHeader}>📅 Daily Notes</h3>
          <div style={styles.timeline}>
            {dailyNotes.map((note, i) => {
              // Parse date from filename
              const match = note.name.match(/^(\d{4})-(\d{2})-(\d{2})/);
              const dateStr = match ? `${match[1]}-${match[2]}-${match[3]}` : note.name;
              
              return (
                <div
                  key={i}
                  onClick={() => loadFileContent(note.path)}
                  style={styles.timelineItem}
                >
                  <div style={styles.timelineDot} />
                  <div style={styles.timelineContent}>
                    <span style={styles.timelineDate}>{dateStr}</span>
                    <span style={styles.timelineFile}>{note.name}</span>
                    <span style={styles.timelineSize}>{formatFileSize(note.size)}</span>
                  </div>
                </div>
              );
            })}
            {dailyNotes.length === 0 && (
              <div style={styles.noResults}>No daily notes found</div>
            )}
          </div>
        </div>
      )}

      {/* Chat Logs Tab */}
      {activeTab === 'chat' && (
        <div style={styles.tabContent}>
          <h3 style={styles.sectionHeader}>💬 Chat Logs</h3>
          <button 
            onClick={() => loadFiles('chat')}
            style={styles.loadChatButton}
          >
            Load Chat History
          </button>
          
          <div style={styles.fileList}>
            {files.filter(f => f.category === 'chat' || currentDir.includes('chat')).map((file, i) => (
              <div
                key={i}
                onClick={() => handleFileClick(file)}
                style={styles.fileItem}
              >
                <span style={styles.fileIcon}>💬</span>
                <span style={styles.fileName}>{file.name}</span>
                <span style={styles.fileMeta}>{formatDate(file.modified)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {selectedFile && (
        <div style={styles.modalOverlay} onClick={() => setSelectedFile(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>{selectedFile.path}</span>
              <button 
                onClick={() => setSelectedFile(null)}
                style={styles.modalClose}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalContent}>
              <pre style={styles.fileContent}>{selectedFile.content}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          ⚠️ {error}
          <button onClick={() => setError(null)} style={styles.errorClose}>✕</button>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: '#1a1a2e',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '600px',
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.2)',
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#fff',
    background: 'rgba(102, 126, 234, 0.2)',
    borderBottom: '2px solid #667eea',
  },
  tabContent: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
  },
  searchBox: {
    position: 'relative',
    marginBottom: '16px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
  },
  searchSpinner: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
  },
  resultCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
    marginBottom: '12px',
  },
  searchResults: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  searchResult: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '12px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  resultIcon: {
    fontSize: '16px',
  },
  resultFile: {
    color: '#fff',
    fontWeight: 500,
    flex: 1,
    fontSize: '0.9rem',
  },
  resultMeta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
  },
  resultMatches: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  matchItem: {
    display: 'flex',
    gap: '8px',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.7)',
  },
  lineNumber: {
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'monospace',
    minWidth: '40px',
  },
  matchText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  noResults: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    padding: '24px',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  breadcrumbItem: {
    background: 'transparent',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  breadcrumbSep: {
    color: 'rgba(255,255,255,0.3)',
  },
  upButton: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.7)',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    marginBottom: '12px',
    width: '100%',
    textAlign: 'left',
  },
  loading: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    padding: '20px',
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  fileIcon: {
    fontSize: '18px',
    width: '24px',
    textAlign: 'center',
  },
  fileName: {
    flex: 1,
    color: 'rgba(255,255,255,0.9)',
    fontSize: '0.85rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileMeta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
  },
  sectionHeader: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: '16px',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingLeft: '12px',
    borderLeft: '2px solid rgba(102, 126, 234, 0.3)',
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    cursor: 'pointer',
    padding: '8px 0',
    marginLeft: '-18px',
  },
  timelineDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#667eea',
    flexShrink: 0,
    marginTop: '4px',
  },
  timelineContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  timelineDate: {
    color: '#667eea',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  timelineFile: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8rem',
  },
  timelineSize: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
  },
  loadChatButton: {
    width: '100%',
    padding: '12px',
    background: 'rgba(102, 126, 234, 0.2)',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    borderRadius: '10px',
    color: '#667eea',
    cursor: 'pointer',
    fontSize: '0.9rem',
    marginBottom: '16px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: '#1a1a2e',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    width: '100%',
    maxWidth: '800px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.2)',
  },
  modalTitle: {
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.95rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  modalClose: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: 'rgba(255,255,255,0.7)',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  modalContent: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
  },
  fileContent: {
    margin: 0,
    padding: 0,
    color: 'rgba(255,255,255,0.85)',
    fontSize: '0.85rem',
    lineHeight: 1.6,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  error: {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    right: '16px',
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#ef4444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
  },
  errorClose: {
    background: 'transparent',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '14px',
  },
};
