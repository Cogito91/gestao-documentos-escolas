export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

export const requestBrowserNotificationPermission = async (): Promise<
  NotificationPermission | 'unsupported'
> => {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
};

export const sendBrowserNotification = async (
  title: string,
  body: string,
  tag?: string
): Promise<boolean> => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const options: NotificationOptions = {
    body,
    tag,
    icon: '/vite.svg',
    badge: '/vite.svg',
  };

  try {
    // Em celulares (Android Chrome / PWA), ServiceWorkerRegistration.showNotification é mais confiável
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }

    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
};
