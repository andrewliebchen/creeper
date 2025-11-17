import { useState, useEffect, useRef } from 'react';
import { useAudioCapture } from '../hooks/useAudioCapture';
import {
  uploadAudioChunk,
  getSessionInsight,
  endSession,
  resumeSession,
  getSession,
  updateDocument,
} from '../services/api';
import { DocumentEditor } from './DocumentEditor';
import { showInsightNotification } from '../services/notifications';
import type { GetSessionResponse } from '@creeper/shared';
import { Button } from './ui/button';

interface SessionViewProps {
  sessionId: string;
  backendUrl: string;
  onSessionEnd?: () => void;
  onListeningChange?: (isListening: boolean) => void;
  autoStart?: boolean; // If true, automatically start listening when session loads
}

export function SessionView({
  sessionId,
  backendUrl,
  onSessionEnd,
  onListeningChange,
  autoStart = false,
}: SessionViewProps) {
  const [sessionData, setSessionData] = useState<GetSessionResponse | null>(null);
  const [documentContent, setDocumentContent] = useState('');
  const [isLLMUpdating, setIsLLMUpdating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [chunkDuration, setChunkDuration] = useState(60);
  const [totalChunks, setTotalChunks] = useState(0);
  const [documentStatus, setDocumentStatus] = useState<{
    isSaving: boolean;
    lastSaved: Date | null;
    isLLMUpdating: boolean;
  }>({ isSaving: false, lastSaved: null, isLLMUpdating: false });
  const insightPollIntervalRef = useRef<number | null>(null);
  const lastContentRef = useRef<string>('');
  const totalChunksRef = useRef<number>(0);

  // Load session data
  useEffect(() => {
    loadSession();
    // Reset last content ref and total chunks when session changes
    lastContentRef.current = '';
    totalChunksRef.current = 0;
    setTotalChunks(0);
  }, [sessionId, backendUrl]);

  const loadSession = async () => {
    try {
      const data = await getSession(sessionId, backendUrl);
      setSessionData(data);
      const content = data.document?.content || '';
      setDocumentContent(content);
      lastContentRef.current = content;
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  // Load chunk duration from settings
  useEffect(() => {
    const saved = localStorage.getItem('creeper_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.chunkDuration) {
          setChunkDuration(parsed.chunkDuration);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  const { isListening, error, chunkCount, startListening, stopListening } =
    useAudioCapture({
      chunkDuration,
      backendUrl,
      onChunkReady: async (chunk, timestamp) => {
        console.log('🎤 Audio chunk ready:', { size: chunk.size, timestamp, sessionId });
        const duration = chunkDuration;

        try {
          console.log(`📤 Uploading chunk to backend with sessionId: ${sessionId}`);
          await uploadAudioChunk(chunk, timestamp, duration, sessionId, backendUrl);
          console.log('✅ Chunk uploaded successfully');
          // Increment total chunks (persists across edit mode)
          totalChunksRef.current += 1;
          setTotalChunks(totalChunksRef.current);
        } catch (err) {
          console.error('❌ Failed to upload chunk:', err);
        }
      },
    });

  // Notify parent when listening state changes
  useEffect(() => {
    onListeningChange?.(isListening);
  }, [isListening, onListeningChange]);

  // Poll for session insights when listening - at the same interval as chunk making
  // Stop polling when in edit mode
  useEffect(() => {
    if (!isListening || !sessionId || isEditMode) {
      if (insightPollIntervalRef.current) {
        clearInterval(insightPollIntervalRef.current);
        insightPollIntervalRef.current = null;
      }
      return;
    }

    const pollInsights = async () => {
      try {
        setIsLLMUpdating(true);
        setDocumentStatus(prev => ({ ...prev, isLLMUpdating: true }));
        const insightResult = await getSessionInsight(sessionId, backendUrl);
        if (insightResult.insight) {
          const newContent = insightResult.insight.content || insightResult.insight.bullets?.join('\n') || '';
          
          // Only update if content actually changed
          if (newContent !== lastContentRef.current) {
            lastContentRef.current = newContent;
            setDocumentContent(newContent);
            // Reload session to get latest data
            await loadSession();
            
            // Show notification for new/updated insights
            if (insightResult.insight.bullets && insightResult.insight.bullets.length > 0) {
              await showInsightNotification(insightResult.insight.bullets);
            }
          }
        }
      } catch (err: any) {
        // Handle 202 (waiting) responses gracefully - these are expected
        if (err?.response?.status === 202 || err?.status === 202) {
          // Silently continue polling - transcripts aren't ready yet
          return;
        }
        
        const errorMsg = err?.message || '';
        if (!errorMsg.includes('No transcripts') && !errorMsg.includes('waiting')) {
          console.error('Failed to get session insight:', err);
        }
      } finally {
        setIsLLMUpdating(false);
        setDocumentStatus(prev => ({ ...prev, isLLMUpdating: false }));
      }
    };

    // Poll at the same interval as chunk making (chunkDuration is in seconds, convert to ms)
    const pollInterval = chunkDuration * 1000;
    pollInsights();
    insightPollIntervalRef.current = window.setInterval(pollInsights, pollInterval);

    return () => {
      if (insightPollIntervalRef.current) {
        clearInterval(insightPollIntervalRef.current);
        insightPollIntervalRef.current = null;
      }
    };
  }, [isListening, sessionId, backendUrl, chunkDuration, isEditMode]);

  // Auto-start listening for new sessions
  useEffect(() => {
    if (autoStart && sessionData && !sessionData.session.endedAt && !isListening) {
      // Small delay to ensure session is fully loaded
      const timer = setTimeout(() => {
        console.log('🚀 Auto-starting listening for new session');
        startListening();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoStart, sessionData, isListening, startListening]);

  const handleToggle = async () => {
    if (isListening) {
      // Stop listening and end session
      stopListening();
      try {
        await endSession(sessionId, backendUrl);
        console.log('Session ended:', sessionId);
        onSessionEnd?.();
        // Reload session to update status
        await loadSession();
      } catch (err) {
        console.error('Failed to end session:', err);
      }
    } else {
      // Start or resume listening
      const isResuming = sessionData?.session.endedAt !== undefined;
      
      if (isResuming) {
        try {
          await resumeSession(sessionId, backendUrl);
          console.log('Session resumed:', sessionId);
          await loadSession();
        } catch (err) {
          console.error('Failed to resume session:', err);
          alert('Failed to resume session. Please try again.');
          return;
        }
      }
      
      startListening();
    }
  };

  const handleDocumentChange = (content: string) => {
    setDocumentContent(content);
  };

  const handleEditModeToggle = async () => {
    if (isEditMode) {
      // Exiting edit mode - save document and trigger LLM update
      try {
        // Save the current document content (this sets user_edited_at)
        await updateDocument(sessionId, documentContent, backendUrl);
        console.log('Document saved after edit mode');
        
        // Immediately trigger LLM update to merge user edits with new transcripts
        try {
          setIsLLMUpdating(true);
          setDocumentStatus(prev => ({ ...prev, isLLMUpdating: true }));
          const insightResult = await getSessionInsight(sessionId, backendUrl);
          if (insightResult.insight) {
            const newContent = insightResult.insight.content || insightResult.insight.bullets?.join('\n') || '';
            lastContentRef.current = newContent;
            setDocumentContent(newContent);
            await loadSession();
            
            // Show notification for new/updated insights
            if (insightResult.insight.bullets && insightResult.insight.bullets.length > 0) {
              await showInsightNotification(insightResult.insight.bullets);
            }
          }
        } catch (err: any) {
          // Handle 202 (waiting) responses gracefully
          if (err?.response?.status !== 202 && err?.status !== 202) {
            console.error('Failed to get session insight after edit:', err);
          }
        } finally {
          setIsLLMUpdating(false);
          setDocumentStatus(prev => ({ ...prev, isLLMUpdating: false }));
        }
      } catch (error) {
        console.error('Failed to save document after edit mode:', error);
      }
    }
    
    setIsEditMode(!isEditMode);
  };

  if (!sessionData) {
    return <div className="p-4 text-center text-muted-foreground">Loading session...</div>;
  }

  return (
    <div className="w-full h-full flex flex-col bg-background">
      <div className="flex justify-between items-start p-6 flex-shrink-0 border-b border-border">
        <div>
          <h2 className="m-0 text-xl leading-tight font-semibold">
            {(sessionData.session as any).name || (
              <>
                Session{' '}
                <span className="text-xs text-muted-foreground font-normal">
                  ({sessionId.substring(0, 8)})
                </span>
              </>
            )}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Started: {new Date(sessionData.session.startedAt).toLocaleString()}
            {sessionData.session.endedAt && (
              <> • Ended: {new Date(sessionData.session.endedAt).toLocaleString()}</>
            )}
            {isListening && <> • Chunks captured: {totalChunks > 0 ? totalChunks : chunkCount}</>}
            {documentStatus.isSaving && <> • <span className="text-orange-500">Saving...</span></>}
            {!documentStatus.isSaving && documentStatus.lastSaved && (
              <> • <span className="text-green-500">Saved {documentStatus.lastSaved.toLocaleTimeString()}</span></>
            )}
            {documentStatus.isLLMUpdating && (
              <> • <span className="text-primary">LLM is updating...</span></>
            )}
          </p>
        </div>
        <div className="flex gap-4">
          <Button 
            onClick={handleEditModeToggle}
            variant={isEditMode ? "default" : "outline"}
            disabled={documentStatus.isLLMUpdating}
          >
            {isEditMode ? 'Done Editing' : 'Edit'}
          </Button>
          <Button onClick={handleToggle}>
            {isListening ? 'Stop Listening' : sessionData.session.endedAt ? 'Resume' : 'Start Listening'}
          </Button>
        </div>
      </div>

      {error && <p className="flex-shrink-0 px-6 my-2 text-destructive">Error: {error}</p>}

      <DocumentEditor
        sessionId={sessionId}
        initialContent={documentContent}
        backendUrl={backendUrl}
        onContentChange={handleDocumentChange}
        isLLMUpdating={isLLMUpdating}
        isListening={isListening}
        isEditMode={isEditMode}
        onStatusChange={setDocumentStatus}
      />
    </div>
  );
}

