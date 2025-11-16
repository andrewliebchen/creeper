import { useState, useEffect, useRef } from 'react';
import { useAudioCapture } from '../hooks/useAudioCapture';
import {
  uploadAudioChunk,
  getSessionInsight,
  endSession,
  resumeSession,
  getSession,
} from '../services/api';
import { DocumentEditor } from './DocumentEditor';
import { showInsightNotification } from '../services/notifications';
import type { GetSessionResponse } from '@creeper/shared';

interface SessionViewProps {
  sessionId: string;
  backendUrl: string;
  onSessionEnd?: () => void;
}

export function SessionView({
  sessionId,
  backendUrl,
  onSessionEnd,
}: SessionViewProps) {
  const [sessionData, setSessionData] = useState<GetSessionResponse | null>(null);
  const [documentContent, setDocumentContent] = useState('');
  const [isLLMUpdating, setIsLLMUpdating] = useState(false);
  const [chunkDuration, setChunkDuration] = useState(60);
  const insightPollIntervalRef = useRef<number | null>(null);
  const lastContentRef = useRef<string>('');

  // Load session data
  useEffect(() => {
    loadSession();
    // Reset last content ref when session changes
    lastContentRef.current = '';
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
        } catch (err) {
          console.error('❌ Failed to upload chunk:', err);
        }
      },
    });

  // Poll for session insights when listening
  useEffect(() => {
    if (!isListening || !sessionId) {
      if (insightPollIntervalRef.current) {
        clearInterval(insightPollIntervalRef.current);
        insightPollIntervalRef.current = null;
      }
      return;
    }

    const pollInsights = async () => {
      try {
        setIsLLMUpdating(true);
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
      }
    };

    // Poll immediately, then every 5 seconds
    pollInsights();
    insightPollIntervalRef.current = window.setInterval(pollInsights, 5000);

    return () => {
      if (insightPollIntervalRef.current) {
        clearInterval(insightPollIntervalRef.current);
        insightPollIntervalRef.current = null;
      }
    };
  }, [isListening, sessionId, backendUrl]);

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

  if (!sessionData) {
    return <div className="loading">Loading session...</div>;
  }

  return (
    <div className="session-view">
      <div className="session-header">
        <div>
          <h2>
            Session{' '}
            <span className="session-id">
              ({sessionId.substring(0, 8)})
            </span>
          </h2>
          <p className="session-meta">
            Started: {new Date(sessionData.session.startedAt).toLocaleString()}
            {sessionData.session.endedAt && (
              <> • Ended: {new Date(sessionData.session.endedAt).toLocaleString()}</>
            )}
          </p>
        </div>
        <div className="session-controls">
          <button onClick={handleToggle}>
            {isListening ? 'Stop Listening' : sessionData.session.endedAt ? 'Resume' : 'Start Listening'}
          </button>
        </div>
      </div>

      {error && <p className="error">Error: {error}</p>}
      {isListening && <p>Chunks captured: {chunkCount}</p>}

      <DocumentEditor
        sessionId={sessionId}
        initialContent={documentContent}
        backendUrl={backendUrl}
        onContentChange={handleDocumentChange}
        isLLMUpdating={isLLMUpdating}
      />
    </div>
  );
}

