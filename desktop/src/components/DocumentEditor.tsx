import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { updateDocument } from '../services/api';

interface DocumentEditorProps {
  sessionId: string;
  initialContent: string;
  backendUrl: string;
  onContentChange?: (content: string) => void;
  isLLMUpdating?: boolean;
  isListening?: boolean;
  onStatusChange?: (status: { isSaving: boolean; lastSaved: Date | null; isLLMUpdating: boolean }) => void;
}

export function DocumentEditor({
  sessionId,
  initialContent,
  backendUrl,
  onContentChange,
  isLLMUpdating = false,
  isListening = false,
  onStatusChange,
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
    // Prevent editing while listening or while LLM is updating (to avoid overwriting user edits)
    if (isListening || isLLMUpdating) {
      return;
    }

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
    // Don't save if already saving, listening, or LLM is updating
    if (isSaving || isListening || isLLMUpdating) return;

    setIsSaving(true);
    try {
      await updateDocument(sessionId, contentToSave, backendUrl);
      const savedTime = new Date();
      setLastSaved(savedTime);
      onStatusChange?.({ isSaving: false, lastSaved: savedTime, isLLMUpdating });
    } catch (error) {
      console.error('Failed to save document:', error);
      // TODO: Show error notification
      onStatusChange?.({ isSaving: false, lastSaved, isLLMUpdating });
    } finally {
      setIsSaving(false);
    }
  };

  // Notify parent of status changes
  useEffect(() => {
    onStatusChange?.({ isSaving, lastSaved, isLLMUpdating });
  }, [isSaving, lastSaved, isLLMUpdating, onStatusChange]);

  const isDisabled = isListening || isLLMUpdating;
  
  const getPlaceholder = () => {
    if (isListening) {
      return "Document editing is disabled while listening. Stop listening to edit.";
    }
    if (isLLMUpdating) {
      return "Document editing is disabled while LLM is updating. Please wait...";
    }
    return "Document will be updated automatically as the meeting progresses...";
  };

  return (
    <div className="document-editor">
      {isDisabled ? (
        <div className="document-markdown">
          {content ? (
            <ReactMarkdown>{content}</ReactMarkdown>
          ) : (
            <div className="document-markdown-placeholder">{getPlaceholder()}</div>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onBlur={handleBlur}
          className="document-textarea"
          placeholder={getPlaceholder()}
          rows={20}
        />
      )}
    </div>
  );
}

