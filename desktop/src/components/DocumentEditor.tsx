import { useState, useEffect, useRef } from 'react';
import { updateDocument } from '../services/api';

interface DocumentEditorProps {
  sessionId: string;
  initialContent: string;
  backendUrl: string;
  onContentChange?: (content: string) => void;
  isLLMUpdating?: boolean;
}

export function DocumentEditor({
  sessionId,
  initialContent,
  backendUrl,
  onContentChange,
  isLLMUpdating = false,
}: DocumentEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update content when initialContent changes (from LLM updates)
  useEffect(() => {
    if (initialContent !== content) {
      setContent(initialContent);
    }
  }, [initialContent]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onContentChange?.(newContent);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Auto-save after 2 seconds of inactivity
    saveTimeoutRef.current = window.setTimeout(() => {
      saveDocument(newContent);
    }, 2000);
  };

  const handleBlur = () => {
    // Save immediately on blur
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    saveDocument(content);
  };

  const saveDocument = async (contentToSave: string) => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await updateDocument(sessionId, contentToSave, backendUrl);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save document:', error);
      // TODO: Show error notification
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="document-editor">
      <div className="document-editor-header">
        <h3>Document</h3>
        <div className="document-status">
          {isSaving && <span className="status-saving">Saving...</span>}
          {!isSaving && lastSaved && (
            <span className="status-saved">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {isLLMUpdating && (
            <span className="status-llm-updating">LLM is updating...</span>
          )}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onBlur={handleBlur}
        className="document-textarea"
        placeholder="Document will be updated automatically as the meeting progresses..."
        rows={20}
      />
    </div>
  );
}

