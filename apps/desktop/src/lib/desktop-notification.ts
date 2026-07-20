import { isTauri } from "@/lib/tauri";

/** Sends a native desktop notification via Tauri. Returns false if unavailable or denied. */
export async function sendDesktopNotification(options: {
  title: string;
  body: string;
}): Promise<boolean> {
  if (!isTauri()) return false;

  const {
    isPermissionGranted,
    requestPermission,
    sendNotification,
  } = await import("@tauri-apps/plugin-notification");

  let granted = await isPermissionGranted();
  if (!granted) {
    const permission = await requestPermission();
    granted = permission === "granted";
  }
  if (!granted) return false;

  await sendNotification(options);
  return true;
}
