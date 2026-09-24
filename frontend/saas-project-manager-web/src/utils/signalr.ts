import * as signalR from '@microsoft/signalr';

let notificationConnection: signalR.HubConnection | null = null;
let projectConnection: signalR.HubConnection | null = null;

export function getNotificationHub(onMessage: (msg: unknown) => void) {
  if (notificationConnection) return notificationConnection;
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';
  const token = localStorage.getItem('accessToken');
  notificationConnection = new signalR.HubConnectionBuilder()
    .withUrl(`${base}/hubs/notifications?access_token=${token}`, { accessTokenFactory: () => token ?? '' })
    .withAutomaticReconnect()
    .build();
  notificationConnection.on('NotificationReceived', onMessage);
  notificationConnection.start().catch(console.error);
  return notificationConnection;
}

export function getProjectHub(projectId: string, handlers: Record<string, (...args: never[]) => void>) {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';
  const token = localStorage.getItem('accessToken');
  if (projectConnection) {
    projectConnection.stop().catch(() => undefined);
  }
  projectConnection = new signalR.HubConnectionBuilder()
    .withUrl(`${base}/hubs/project?access_token=${token}`, { accessTokenFactory: () => token ?? '' })
    .withAutomaticReconnect()
    .build();
  Object.entries(handlers).forEach(([event, handler]) => {
    projectConnection!.on(event, handler as (...args: unknown[]) => void);
  });
  projectConnection.start().then(() => {
    projectConnection!.invoke('JoinProject', projectId).catch(console.error);
  }).catch(console.error);
  return projectConnection;
}
