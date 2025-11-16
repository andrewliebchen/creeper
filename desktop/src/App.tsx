import { useState, useEffect, useRef } from "react";
import { useAudioCapture } from "./hooks/useAudioCapture";
import { uploadAudioChunk, getSessionInsight, createSession, endSession } from "./services/api";
import { Settings } from "./components/Settings";
import { showInsightNotification } from "./services/notifications";

function App() {
  const [chunks, setChunks] = useState<Array<{ timestamp: number; size: number; snippetId?: string }>>([]);
  const [currentInsight, setCurrentInsight] = useState<{ bullets: string[]; content?: string; updatedAt: string } | null>(null);
  const [backendUrl] = useState<string>("http://localhost:3000");
  const [showSettings, setShowSettings] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null); // Use ref to avoid stale closure issues
  const insightPollIntervalRef = useRef<number | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const [chunkDuration, setChunkDuration] = useState(60);
  
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

  const { isListening, error, chunkCount, startListening, stopListening } = useAudioCapture({
    chunkDuration, // Use saved chunk duration
    backendUrl,
    onChunkReady: async (chunk, timestamp) => {
      // Use ref to get current sessionId (avoids stale closure)
      const currentSessionId = sessionIdRef.current;
      
      if (!currentSessionId) {
        console.error('❌ No session ID available - cannot upload chunk');
        return;
      }

      console.log('🎤 Audio chunk ready:', { size: chunk.size, timestamp, sessionId: currentSessionId });
      const duration = chunkDuration; // Use configured chunk duration
      
      try {
        // Upload chunk to backend with sessionId
        console.log(`📤 Uploading chunk to backend with sessionId: ${currentSessionId}`);
        const result = await uploadAudioChunk(chunk, timestamp, duration, currentSessionId, backendUrl);
        console.log('✅ Chunk uploaded successfully:', result);
        
        setChunks((prev) => [...prev, { timestamp, size: chunk.size, snippetId: result.snippetId }].slice(-10));
        
        // Trigger insight update after a delay (transcription takes time)
        // The polling will handle this
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

    // Poll for insights every 5 seconds
    const pollInsights = async () => {
      try {
        const insightResult = await getSessionInsight(sessionId, backendUrl);
        if (insightResult.insight) {
          const hasChanged = !currentInsight || 
            currentInsight.updatedAt !== insightResult.insight.updatedAt ||
            JSON.stringify(currentInsight.bullets) !== JSON.stringify(insightResult.insight.bullets);
          
          if (hasChanged) {
            setCurrentInsight({
              bullets: insightResult.insight.bullets || [],
              content: insightResult.insight.content,
              updatedAt: insightResult.insight.updatedAt || insightResult.insight.createdAt,
            });
            
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
        // Don't log errors for "no transcripts yet" - that's expected
        if (!errorMsg.includes('No transcripts') && !errorMsg.includes('waiting')) {
          console.error('Failed to get session insight:', err);
        }
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
  }, [isListening, sessionId, backendUrl, currentInsight]);

  const handleToggle = async () => {
    if (isListening) {
      // Stop listening and end session
      stopListening();
      if (sessionId) {
        try {
          await endSession(sessionId, backendUrl);
          console.log('Session ended:', sessionId);
        } catch (err) {
          console.error('Failed to end session:', err);
        }
        setSessionId(null);
      }
      setCurrentInsight(null);
    } else {
      // Start listening and create session
      try {
        console.log('Creating session...');
        const session = await createSession(backendUrl);
        console.log('✅ Session created:', session.sessionId);
        
        // Set both state and ref immediately
        setSessionId(session.sessionId);
        sessionIdRef.current = session.sessionId;
        
        console.log('Starting audio capture with sessionId:', session.sessionId);
        // Start listening - sessionId is now available via ref
        startListening();
      } catch (err) {
        console.error('Failed to create session:', err);
        alert('Failed to start session. Please try again.');
      }
    }
  };

  return (
    <div className="container">
      <h1>Creeper</h1>
      <p>Meeting Copilot MVP</p>
      <div className="status">
        <p>Status: {isListening ? "Listening" : "Stopped"}</p>
        {error && <p className="error">Error: {error}</p>}
        <button onClick={handleToggle}>
          {isListening ? "Stop Listening" : "Start Listening"}
        </button>
        <button onClick={() => setShowSettings(true)} style={{ marginLeft: '1rem' }}>
          Settings
        </button>
        {isListening && <p>Chunks captured: {chunkCount}</p>}
      </div>
      {showSettings && <Settings onClose={() => {
        setShowSettings(false);
        // Reload chunk duration from settings
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
      }} />}
      {chunks.length > 0 && (
        <div className="chunks">
          <h3>Recent Chunks</h3>
          <ul>
            {chunks.map((chunk, idx) => (
              <li key={idx}>
                {new Date(chunk.timestamp).toLocaleTimeString()} - {chunk.size} bytes
                {chunk.snippetId && <span className="snippet-id"> ({chunk.snippetId.substring(0, 8)})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {currentInsight && (
        <div className="insights">
          <h3>Session Insights {sessionId && <span className="session-id">({sessionId.substring(0, 8)})</span>}</h3>
          <ul>
            {currentInsight.bullets.map((bullet, bulletIdx) => (
              <li key={bulletIdx}>{bullet}</li>
            ))}
          </ul>
          {currentInsight.content && currentInsight.content !== currentInsight.bullets.join('\n') && (
            <details style={{ marginTop: '1rem', fontSize: '0.9em', color: '#666' }}>
              <summary>Full insight document</summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>{currentInsight.content}</pre>
            </details>
          )}
          <p style={{ fontSize: '0.8em', color: '#666', marginTop: '0.5rem' }}>
            Last updated: {new Date(currentInsight.updatedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;

