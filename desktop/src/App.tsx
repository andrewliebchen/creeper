import { useState, useEffect } from "react";
import { useAudioCapture } from "./hooks/useAudioCapture";
import { uploadAudioChunk, getInsight } from "./services/api";
import { Settings } from "./components/Settings";
import { showInsightNotification } from "./services/notifications";

function App() {
  const [chunks, setChunks] = useState<Array<{ timestamp: number; size: number; snippetId?: string }>>([]);
  const [insights, setInsights] = useState<Array<{ snippetId: string; bullets: string[] }>>([]);
  const [backendUrl] = useState<string>("http://localhost:3000");
  const [showSettings, setShowSettings] = useState(false);

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
      console.log('Audio chunk ready:', { size: chunk.size, timestamp });
      const duration = chunkDuration; // Use configured chunk duration
      
      try {
        // Upload chunk to backend
        const result = await uploadAudioChunk(chunk, timestamp, duration, backendUrl);
        console.log('Chunk uploaded:', result);
        
        setChunks((prev) => [...prev, { timestamp, size: chunk.size, snippetId: result.snippetId }].slice(-10));
        
        // Poll for transcript and generate insight (with delay for processing)
        setTimeout(async () => {
          try {
            const insightResult = await getInsight(result.snippetId, undefined, backendUrl);
            const newInsight = {
              snippetId: result.snippetId,
              bullets: insightResult.insight.bullets,
            };
            setInsights((prev) => [...prev, newInsight].slice(-10));
            
            // Show notification
            await showInsightNotification(insightResult.insight.bullets);
          } catch (err) {
            console.error('Failed to get insight:', err);
          }
        }, 5000); // Wait 5 seconds for transcription to complete
      } catch (err) {
        console.error('Failed to upload chunk:', err);
      }
    },
  });

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
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
      {insights.length > 0 && (
        <div className="insights">
          <h3>Recent Insights</h3>
          <ul>
            {insights.map((insight, idx) => (
              <li key={idx}>
                <strong>Snippet {insight.snippetId.substring(0, 8)}:</strong>
                <ul>
                  {insight.bullets.map((bullet, bulletIdx) => (
                    <li key={bulletIdx}>{bullet}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;

