/**
 * send-push — Supabase Edge Function · Nelson Companion
 *
 * Envía notificaciones Web Push a todos los dispositivos suscritos
 * para recordatorios de medicación.
 *
 * Invocar desde GitHub Actions con:
 *   curl -X POST https://<project>.supabase.co/functions/v1/send-push \
 *        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
 *        -H "Content-Type: application/json" \
 *        -d '{"slotId":"20260424_0800","title":"Medicación 08:00","body":"Hora de tomar Aspirina y Clopidogrel"}'
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webPush from 'https://esm.sh/web-push@3.6.6';

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_EMAIL       = Deno.env.get('VAPID_EMAIL') || 'mailto:cluciani@gmail.com';

webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { slotId, title, body, url } = await req.json();

    if (!slotId || !title || !body) {
      return new Response(JSON.stringify({ error: 'slotId, title y body son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('patient_id', 'nelson_luciani');

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'Sin suscriptores' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      tag: slotId,
      url: url || './patient.html',
    });

    const results = await Promise.allSettled(
      subs.map(sub =>
        webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      )
    );

    const sent   = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Clean up expired/invalid subscriptions (HTTP 410 Gone)
    const expiredEndpoints: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected' && String(r.reason).includes('410')) {
        expiredEndpoints.push(subs[i].endpoint);
      }
    });
    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
    }

    return new Response(JSON.stringify({ sent, failed }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
