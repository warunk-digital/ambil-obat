import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';

// Configure Web Push with VAPID details
const mailto = 'mailto:support@ambilobat.com';
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(mailto, vapidPublicKey, vapidPrivateKey);
}

function getStatusInfo(status: string) {
  switch (status) {
    case 'pending':
      return { title: 'Pesanan Dibuat', body: 'Menunggu konfirmasi apotek.' };
    case 'confirmed':
      return { title: 'Pesanan Dikonfirmasi', body: 'Apotek sedang menyiapkan obat Anda.' };
    case 'courier_assigned':
      return { title: 'Kurir Ditugaskan', body: 'Kurir telah ditugaskan untuk mengambil obat.' };
    case 'picked_up':
      return { title: 'Obat Diambil', body: 'Kurir telah mengambil obat dari apotek.' };
    case 'on_delivery':
      return { title: 'Sedang Diantar', body: 'Kurir sedang dalam perjalanan ke alamat Anda.' };
    case 'delivered':
      return { title: 'Obat Diterima', body: 'Pesanan obat Anda telah selesai diantar.' };
    case 'cancelled':
      return { title: 'Pesanan Dibatalkan', body: 'Pesanan obat Anda telah dibatalkan.' };
    default:
      return { title: 'Pembaruan Transaksi', body: `Status pesanan: ${status}` };
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const secret = process.env.NOTIFICATION_WEBHOOK_SECRET;

    // Basic authentication check
    if (authHeader !== `Bearer ${secret}` && request.headers.get('x-webhook-secret') !== secret) {
      // Allow secret to be passed via search parameters for easier testing/development
      const { searchParams } = new URL(request.url);
      const urlSecret = searchParams.get('secret');
      if (urlSecret !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    let userId = '';
    let title = '';
    let message = '';
    let url = '/';

    // 1. Detect if it's a Supabase Webhook payload
    if (body && body.table === 'delivery_requests' && body.record) {
      const newRecord = body.record;
      const oldRecord = body.old_record;

      // Only trigger if status changed
      if (oldRecord && newRecord.status === oldRecord.status) {
        return NextResponse.json({ message: 'Status did not change, skipping notification' }, { status: 200 });
      }

      userId = newRecord.user_id;
      const statusInfo = getStatusInfo(newRecord.status);
      title = statusInfo.title;
      message = `${statusInfo.body} (No: ${newRecord.request_number})`;
      url = `/orders/${newRecord.id}`;
    } 
    // 2. Otherwise assume it's a direct API payload
    else if (body && body.userId && body.title && body.body) {
      userId = body.userId;
      title = body.title;
      message = body.body;
      url = body.url || '/';
    } else {
      return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Initialize Supabase Client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get subscriptions using the secure RPC function
    const { data: subscriptions, error } = await supabase.rpc('get_user_push_subscriptions', {
      p_user_id: userId,
      p_secret: secret
    });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json({ error: 'Failed to retrieve subscriptions' }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscriptions found for user' }, { status: 200 });
    }

    // Send push notification to all user's registered PWA subscriptions
    const notificationPayload = JSON.stringify({
      title,
      body: message,
      url
    });

    const sendPromises = subscriptions.map((sub: any) => {
      // sub contains { subscription: { endpoint, keys: { auth, p256dh } } }
      const subscriptionObj = typeof sub.subscription === 'string' 
        ? JSON.parse(sub.subscription) 
        : sub.subscription;

      return webPush.sendNotification(subscriptionObj, notificationPayload)
        .catch(async (err) => {
          // If subscription is expired or unsubscribed, remove from DB
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`Removing defunct subscription for user ${userId}:`, subscriptionObj.endpoint);
            await supabase
              .from('push_subscriptions')
              .delete()
              .match({ user_id: userId })
              .filter('subscription->>endpoint', 'eq', subscriptionObj.endpoint);
          } else {
            console.error('Web Push send error:', err);
          }
        });
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ message: `Push notifications sent to ${subscriptions.length} devices` }, { status: 200 });
  } catch (error: any) {
    console.error('Trigger API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
