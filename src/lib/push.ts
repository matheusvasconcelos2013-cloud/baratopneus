import { supabase } from './supabase';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function pushSuportado() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function pushJaAtivo() {
  if (!pushSuportado()) return false;
  if (Notification.permission !== 'granted') return false;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return !!subscription;
}

export async function ativarPushNotifications(colaboradorEmail: string) {
  if (!pushSuportado()) {
    throw new Error('Este navegador não suporta notificações push.');
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error('Chave VAPID não configurada.');
  }

  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') {
    throw new Error('Permissão de notificação negada.');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const { data: colaborador } = await supabase
    .from('colaboradores')
    .select('id')
    .eq('email', colaboradorEmail)
    .single();

  if (!colaborador) {
    throw new Error('Colaborador não encontrado.');
  }

  const json = subscription.toJSON();
  await supabase.from('push_subscriptions').upsert(
    {
      colaborador_id: colaborador.id,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    },
    { onConflict: 'endpoint' }
  );
}

export async function desativarPushNotifications() {
  if (!pushSuportado()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
    await subscription.unsubscribe();
  }
}
