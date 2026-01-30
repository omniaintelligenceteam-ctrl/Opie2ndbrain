'use client';
import { useState, useEffect, useCallback } from 'react';

interface WorkspaceFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  important?: boolean;
}

interface WorkspaceBrowserProps {
  onFileSelect?: (path: string, content: string) => void;
}

export default function WorkspaceBrowser({ onFileSelect }: WorkspaceBrowserProps) {
  const [importantFiles, setImportantFiles] = useState<WorkspaceFile[]>([]);
  const [browseableDirs, setBrowseableDirs] = useState<WorkspaceFile[]>([]);
  const [currentDir, setCurrentDir] = useState<string | null>(null);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [parentDir, setParentDir] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // Load workspace overview
  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/workspace?overview=true');
      const data = await res.json();
      setImportantFiles(data.importantFiles || []);
      setBrowseableDirs(data.browseableDirs || []);
    } catch (err) {
      console.error('Failed to load workspace overview:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load directory contents
  const loadDirectory = useCallback(async (dir: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/workspace?dir=${encodeURIComponent(dir)}`);
      const data = await res.json();
      setFiles(data.files || []);
      setCurrentDir(data.currentDir);
      setParentDir(data.parent);
    } catch (err) {
      console.error('Failed to load directory:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load file content
  const loadFileContent = useCallback(async (filePath: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/workspace?file=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      
      if (data.error) {
        console.error(data.error);
      } else {
        setSelectedFile({ path: filePath, content: data.content });
        onFileSelect?.(filePath, data.content);
      }
    } catch (err) {
      console.error('Failed to load file:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onFileSelect]);

  // Initial load
  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleFileClick = (file: WorkspaceFile) => {
    if (file.type === 'directory') {
      loadDirectory(file.path);
    } else {
      loadFileContent(file.path);
    }
  };

  const handleBack = () => {
    if (parentDir !== null) {
      if (parentDir === '' || parentDir === '.') {
        setCurrentDir(null);
        setFiles([]);
      } else {
        loadDirectory(parentDir);
      }
    } else {
      setCurrentDir(null);
      setFiles([]);
    }
  };

  const toggleExpand = (dirPath: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
        loadDirectory(dirPath);
      }
      return next;
    });
  };

  const getFileIcon = (file: WorkspaceFile) => {
    if (file.type === 'directory') return '📁';
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'md': return '📝';
      case 'json': return '📋';
      case 'ts':
      case 'tsx': return '🔷';
      case 'js':
      case 'jsx': return '🟨';
      case 'yaml':
      case 'yml': return '⚙️';
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
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>📂</span>
        <span style={styles.headerTitle}>Workspace Browser</span>
      </div>

      <div style={styles.content}>
        {/* Show overview or directory listing */}
        {currentDir === null ? (
          <>
            {/* Important Files */}
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>⭐ Key Files</h4>
              <div style={styles.fileGrid}>
                {importantFiles.map((file, i) => (
                  <div
                    key={i}
                    onClick={() => handleFileClick(file)}
                    style={styles.keyFile}
                  >
                    <span style={styles.keyFileIcon}>📝</span>
                    <span style={styles.keyFileName}>{file.name}</span>
                    <span style={styles.keyFileSize}>{formatFileSize(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Browseable Directories */}
            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>📁 Directories</h4>
              <div style={styles.dirList}>
                {browseableDirs.map((dir, i) => (
                  <div
                    key={i}
                    onClick={() => loadDirectory(dir.path)}
                    style={styles.dirItem}
                  >
                    <span style={styles.dirIcon}>📁</span>
                    <span style={styles.dirName}>{dir.name}</span>
                    <span style={styles.dirArrow}>→</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Directory Breadcrumb */}
            <div style={styles.breadcrumb}>
              <button onClick={handleBack} style={styles.backButton}>
                ← Back
              </button>
              <span style={styles.currentPath}>/{currentDir}</span>
            </div>

            {/* File List */}
            {isLoading ? (
              <div style={styles.loading}>Loading...</div>
            ) : (
              <div style={styles.fileList}>
                {files.map((file, i) => (
                  <div
                    key={i}
                    onClick={() => handleFileClick(file)}
                    style={styles.fileItem}
                  >
                    <span style={styles.fileIcon}>{getFileIcon(file)}</span>
                    <span style={styles.fileName}>{file.name}</span>
                    <span style={styles.fileMeta}>
                      {file.type === 'file' ? formatFileSize(file.size) : ''}
                    </span>
                  </div>
                ))}
                {files.length === 0 && (
                  <div style={styles.empty}>Directory is empty</div>
                )}
              </div>
            )}
          </>
        )}
      </div>

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
    height: '500px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.2)',
  },
  headerIcon: {
    fontSize: '20px',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 600,
    fontSize: '1rem',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '0.9rem',
    fontWeight: 600,
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  fileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '10px',
  },
  keyFile: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    background: 'rgba(102, 126, 234, 0.1)',
    border: '1px solid rgba(102, 126, 234, 0.2)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  keyFileIcon: {
    fontSize: '18px',
  },
  keyFileName: {
    flex: 1,
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  keyFileSize: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.7rem',
  },
  dirList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  dirItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  dirIcon: {
    fontSize: '18px',
  },
  dirName: {
    flex: 1,
    color: 'rgba(255,255,255,0.9)',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  dirArrow: {
    color: 'rgba(255,255,255,0.3)',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  backButton: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    padding: '8px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  currentPath: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
  },
  loading: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    padding: '40px',
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
    fontSize: '16px',
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
  empty: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    padding: '40px',
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
    maxWidth: '900px',
    maxHeight: '85vh',
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
    fontFamily: 'monospace',
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
};
