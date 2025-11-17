import { 
  sendNotification, 
  isPermissionGranted, 
  requestPermission 
} from '@tauri-apps/plugin-notification';

let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 5000; // 5 seconds between notifications
let permissionChecked = false;

async function ensureNotificationPermission(): Promise<boolean> {
  if (permissionChecked) {
    return await isPermissionGranted();
  }
  
  permissionChecked = true;
  
  let permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    permissionGranted = await requestPermission();
  }
  
  return permissionGranted;
}

export async function showInsightNotification(bullets: string[]): Promise<void> {
  const now = Date.now();
  
  // Rate limiting to avoid spam
  if (now - lastNotificationTime < NOTIFICATION_COOLDOWN) {
    return;
  }
  
  // Check and request permission if needed
  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    console.warn('Notification permission not granted');
    return;
  }
  
  lastNotificationTime = now;
  
  const title = 'Creeper Insight';
  const body = bullets.slice(0, 2).join('\n'); // Show first 2 bullets
  
  try {
    await sendNotification({
      title,
      body,
      sound: 'default',
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

