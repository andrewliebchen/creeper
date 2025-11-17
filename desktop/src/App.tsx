import { useState } from "react";
import { createSession } from "./services/api";
import { SessionList } from "./components/SessionList";
import { SessionView } from "./components/SessionView";
import { Settings } from "./components/Settings";
import { Button } from "./components/ui/button";

function App() {
  const [backendUrl] = useState<string>("http://localhost:3000");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [listeningSessionId, setListeningSessionId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isNewSession, setIsNewSession] = useState(false);

  const handleNewSession = async () => {
    try {
      console.log('Creating new session...');
      const session = await createSession(backendUrl);
      console.log('✅ Session created:', session.sessionId);
      setCurrentSessionId(session.sessionId);
      setIsNewSession(true); // Mark as new session for auto-start
      // Trigger session list refresh
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to create session:', err);
      alert('Failed to create session. Please try again.');
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setIsNewSession(false); // Not a new session when selecting existing one
    // Clear listening session ID when switching - new session will set it if listening
    setListeningSessionId(null);
  };

  const handleSessionEnd = () => {
    // Optionally clear current session or keep it selected
    // For now, we'll keep it selected so user can see the final document
  };

  return (
    <div className="flex flex-col h-screen w-screen">
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[300px] border-r border-border overflow-y-auto bg-card">
          <SessionList
            backendUrl={backendUrl}
            currentSessionId={currentSessionId}
            listeningSessionId={listeningSessionId}
            onSessionSelect={handleSessionSelect}
            onNewSession={handleNewSession}
            refreshTrigger={refreshTrigger}
            onSettingsClick={() => setShowSettings(true)}
          />
        </div>
        <div className="flex-1 overflow-hidden p-0 flex flex-col min-w-0">
          {currentSessionId ? (
            <SessionView
              key={currentSessionId}
              sessionId={currentSessionId}
              backendUrl={backendUrl}
              onSessionEnd={() => {
                handleSessionEnd();
                setIsNewSession(false);
              }}
              onListeningChange={(isListening) => {
                setListeningSessionId(isListening ? currentSessionId : null);
              }}
              autoStart={isNewSession}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <h2 className="text-2xl font-semibold mb-2">Welcome to Creeper</h2>
              <p className="text-muted-foreground mb-4">Select a session from the list or create a new one to get started.</p>
              <Button onClick={handleNewSession}>
                Create New Session
              </Button>
            </div>
          )}
        </div>
      </div>
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;
