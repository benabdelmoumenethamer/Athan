package com.adhan.algeria.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.core.content.ContextCompat;

import org.json.JSONObject;

/** Reçoit le déclenchement d'une alarme (Adhan ou rappel). */
public class AdhanAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AdhanAlarmReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !AdhanAlarms.ACTION_FIRE.equals(intent.getAction())) return;
        String json = intent.getStringExtra(AdhanAlarms.EXTRA_ALARM);
        if (json == null) return;

        JSONObject o;
        try {
            o = new JSONObject(json);
        } catch (Exception e) {
            Log.w(TAG, "alarme illisible: " + e.getMessage());
            return;
        }

        // Alarme périmée (ex. téléphone éteint plusieurs heures) : on ignore l'Adhan raté de plus de 15 min
        long late = System.currentTimeMillis() - o.optLong("at");
        if (late > 15 * 60 * 1000L) {
            AdhanAlarms.maybeNotifyStale(context);
            return;
        }

        String kind = o.optString("kind", "adhan");
        if ("pre".equals(kind)) {
            AdhanAlarms.postPreNotification(context, o);
        } else {
            AdhanAlarms.ensureChannels(context);
            AdhanAlarms.wakeScreen(context, 10000);

            if (o.optBoolean("playAdhan", true)) {
                try {
                    Intent svc = new Intent(context, AdhanService.class);
                    svc.setAction(AdhanService.ACTION_START);
                    svc.putExtra(AdhanAlarms.EXTRA_ALARM, json);
                    ContextCompat.startForegroundService(context, svc);
                } catch (Exception e) {
                    // Repli : notification plein écran avec le son par défaut
                    Log.w(TAG, "service refusé, repli sur notification: " + e.getMessage());
                    AdhanAlarms.postBeepNotification(context, o, true);
                }
            } else {
                AdhanAlarms.postBeepNotification(context, o, false);
            }
        }
        AdhanAlarms.maybeNotifyStale(context);
    }
}
