import { useState } from "react";
import { createSession } from "./services/api";
import { SessionList } from "./components/SessionList";
import { SessionView } from "./components/SessionView";

function App() {
  const [backendUrl] = useState<string>("http://localhost:3000");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleNewSession = async () => {
    try {
      console.log('Creating new session...');
      const session = await createSession(backendUrl);
      console.log('✅ Session created:', session.sessionId);
      setCurrentSessionId(session.sessionId);
      // Trigger session list refresh
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to create session:', err);
      alert('Failed to create session. Please try again.');
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleSessionEnd = () => {
    // Optionally clear current session or keep it selected
    // For now, we'll keep it selected so user can see the final document
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>Creeper</h1>
        <p>Meeting Copilot MVP</p>
      </div>
      <div className="app-content">
        <div className="app-sidebar">
          <SessionList
            backendUrl={backendUrl}
            currentSessionId={currentSessionId}
            onSessionSelect={handleSessionSelect}
            onNewSession={handleNewSession}
            refreshTrigger={refreshTrigger}
          />
        </div>
        <div className="app-main">
          {currentSessionId ? (
            <SessionView
              sessionId={currentSessionId}
              backendUrl={backendUrl}
              onSessionEnd={handleSessionEnd}
            />
          ) : (
            <div className="welcome-screen">
              <h2>Welcome to Creeper</h2>
              <p>Select a session from the list or create a new one to get started.</p>
              <button onClick={handleNewSession}>Create New Session</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
