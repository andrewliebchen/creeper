import { useEffect, useState, useRef } from 'react';
import { listSessions } from '../services/api';
import type { SessionSummary } from '@creeper/shared';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface SessionListProps {
  backendUrl: string;
  currentSessionId: string | null;
  listeningSessionId: string | null; // ID of session currently listening
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  refreshTrigger?: number; // Increment this to force refresh
  onSettingsClick: () => void;
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
  listeningSessionId,
  onSessionSelect,
  onNewSession,
  refreshTrigger,
  onSettingsClick,
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
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <Button onClick={onNewSession} size="sm" variant="default">
          + New
        </Button>
        <Button onClick={onSettingsClick} size="sm" variant="outline">
          Settings
        </Button>
      </div>
      {loading && <div className="p-4 text-center text-muted-foreground">Loading sessions...</div>}
      {error && <div className="p-4 text-destructive">Error: {error}</div>}
      {!loading && !error && (
        <ul className="flex-1 overflow-y-auto list-none p-0 m-0">
          {sessions.length === 0 ? (
            <li className="p-8 text-center text-muted-foreground">No sessions yet</li>
          ) : (
            sessions.map((session) => (
              <li key={session.id} className="border-b border-border last:border-b-0">
                <Card
                  className={`cursor-pointer transition-colors hover:bg-accent rounded-none border-0 border-l-4 ${
                    session.id === currentSessionId
                      ? 'bg-accent border-l-primary'
                      : session.isActive
                      ? 'border-l-green-500'
                      : 'border-l-transparent'
                  }`}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex flex-col gap-1">
                        {session.name ? (
                          <span className="text-base font-medium text-foreground">{session.name}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {formatDate(session.startedAt)}
                          </span>
                        )}
                        {session.name && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(session.startedAt)}
                          </span>
                        )}
                      </div>
                      {session.id === listeningSessionId && (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          Active
                        </Badge>
                      )}
                    </div>
                    {session.documentPreview && (
                      <div className="text-sm text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                        {session.documentPreview}
                      </div>
                    )}
                  </div>
                </Card>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

