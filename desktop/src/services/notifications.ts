import { sendNotification } from '@tauri-apps/plugin-notification';

let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 5000; // 5 seconds between notifications

export async function showInsightNotification(bullets: string[]): Promise<void> {
  const now = Date.now();
  
  // Rate limiting to avoid spam
  if (now - lastNotificationTime < NOTIFICATION_COOLDOWN) {
    return;
  }
  
  lastNotificationTime = now;
  
  const title = 'Creeper Insight';
  const body = bullets.slice(0, 2).join('\n'); // Show first 2 bullets
  
  await sendNotification({
    title,
    body,
    sound: 'default',
  });
}

