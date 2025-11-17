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
  isEditMode?: boolean;
  onStatusChange?: (status: { isSaving: boolean; lastSaved: Date | null; isLLMUpdating: boolean }) => void;
}

export function DocumentEditor({
  sessionId,
  initialContent,
  backendUrl,
  onContentChange,
  isLLMUpdating = false,
  isListening = false,
  isEditMode = false,
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
    // In edit mode, allow editing even while listening or LLM updating
    // Outside edit mode, prevent editing while listening or while LLM is updating
    if (!isEditMode && (isListening || isLLMUpdating)) {
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
    // In edit mode, always allow auto-save (even while listening)
    // Outside edit mode, only auto-save when not listening and not updating
    if (isEditMode || (!isListening && !isLLMUpdating)) {
      saveTimeoutRef.current = window.setTimeout(() => {
        saveDocument(newContent);
      }, 2000);
    }
  };

  const handleBlur = () => {
    // Save immediately on blur
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    // In edit mode, always allow save (even while listening)
    // Outside edit mode, only save when not listening and not updating
    if (isEditMode || (!isListening && !isLLMUpdating)) {
      saveDocument(content);
    }
  };

  const saveDocument = async (contentToSave: string) => {
    // Don't save if already saving
    if (isSaving) return;
    
    // In edit mode, always allow saving (even while listening or LLM updating)
    // Outside edit mode, don't save while listening or LLM updating
    if (!isEditMode && (isListening || isLLMUpdating)) return;

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

  // Only allow editing when in edit mode
  // Outside edit mode, always show markdown (readonly)
  const isDisabled = !isEditMode;
  
  const getPlaceholder = () => {
    if (isEditMode) {
      return "Edit the document. Changes will be merged with new transcripts when you're done.";
    }
    return "Click 'Edit' to enable editing mode. Document will be updated automatically as the meeting progresses...";
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
          className="w-full flex-1 min-h-0 p-8 border-none bg-transparent text-foreground font-mono text-base leading-relaxed resize-none outline-none box-border overflow-wrap break-word"
          style={{
            fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
          }}
          placeholder={getPlaceholder()}
          rows={20}
        />
      )}
    </div>
  );
}

