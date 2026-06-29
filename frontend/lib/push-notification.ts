import { createClient } from '@/lib/supabase/client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush(userId: string) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if subscription already exists
    const existingSubscription = await registration.pushManager.getSubscription();
    
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.error('VAPID public key not found in environment variables.');
      return null;
    }

    let subscription = existingSubscription;
    if (!subscription) {
      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      };
      subscription = await registration.pushManager.subscribe(subscribeOptions);
      console.log('User subscribed successfully:', subscription);
    }
    
    // Save/Sync to Supabase database
    const supabase = createClient();
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        subscription: subscription.toJSON()
      }, {
        onConflict: 'user_id, subscription'
      });

    if (error) {
      console.error('Error saving subscription to DB:', error);
    }

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe user to push:', error);
    return null;
  }
}

export async function unsubscribeUserFromPush(userId: string) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      const subJson = subscription.toJSON();
      await subscription.unsubscribe();
      
      const supabase = createClient();
      await supabase
        .from('push_subscriptions')
        .delete()
        .match({ user_id: userId, subscription: subJson });
      
      console.log('User unsubscribed successfully');
    }
  } catch (error) {
    console.error('Failed to unsubscribe user from push:', error);
  }
}
