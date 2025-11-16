import { useEffect, useState, useRef } from 'react';
import { listSessions } from '../services/api';
import type { SessionSummary } from '@creeper/shared';

interface SessionListProps {
  backendUrl: string;
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  refreshTrigger?: number; // Increment this to force refresh
}

// Compare two session arrays to see if they're different
function sessionsChanged(
  oldSessions: SessionSummary[],
  newSessions: SessionSummary[]
): boolean {
  if (oldSessions.length !== newSessions.length) {
    return true;
  }

  // Create a map of old sessions by ID for quick lookup
  const oldMap = new Map(oldSessions.map(s => [s.id, s]));

  for (const newSession of newSessions) {
    const oldSession = oldMap.get(newSession.id);
    
    // New session or changed data
    if (!oldSession) {
      return true;
    }

    // Check if key fields changed
    if (
      oldSession.isActive !== newSession.isActive ||
      oldSession.lastUpdated !== newSession.lastUpdated ||
      oldSession.documentPreview !== newSession.documentPreview
    ) {
      return true;
    }
  }

  return false;
}

export function SessionList({
  backendUrl,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  refreshTrigger,
}: SessionListProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialLoad = useRef(true);

  const loadSessions = async () => {
    try {
      // Only show loading on initial load
      if (isInitialLoad.current) {
        setLoading(true);
      }
      setError(null);
      const response = await listSessions(backendUrl);
      
      // Only update state if sessions actually changed
      setSessions(prevSessions => {
        if (sessionsChanged(prevSessions, response.sessions)) {
          return response.sessions;
        }
        return prevSessions; // No change, return previous to avoid re-render
      });
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      if (isInitialLoad.current) {
        setLoading(false);
        isInitialLoad.current = false;
      }
    }
  };

  useEffect(() => {
    loadSessions();
    // Refresh sessions every 10 seconds (reduced frequency)
    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  // Refresh when refreshTrigger changes (e.g., new session created)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadSessions();
    }
  }, [refreshTrigger]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="session-list">
      <div className="session-list-header">
        <h2>Sessions</h2>
        <button onClick={onNewSession} className="new-session-btn">
          + New
        </button>
      </div>
      {loading && <div className="loading">Loading sessions...</div>}
      {error && <div className="error">Error: {error}</div>}
      {!loading && !error && (
        <ul className="session-list-items">
          {sessions.length === 0 ? (
            <li className="session-list-empty">No sessions yet</li>
          ) : (
            sessions.map((session) => (
              <li
                key={session.id}
                className={`session-item ${
                  session.id === currentSessionId ? 'active' : ''
                } ${session.isActive ? 'is-active' : ''}`}
                onClick={() => onSessionSelect(session.id)}
              >
                <div className="session-item-header">
                  <span className="session-item-time">
                    {formatDate(session.startedAt)}
                  </span>
                  {session.isActive && (
                    <span className="session-item-badge">Active</span>
                  )}
                </div>
                {session.documentPreview && (
                  <div className="session-item-preview">
                    {session.documentPreview}
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

