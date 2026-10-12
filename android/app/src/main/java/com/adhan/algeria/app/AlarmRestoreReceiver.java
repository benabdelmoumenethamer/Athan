package com.adhan.algeria.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Réarme les alarmes après un redémarrage, une mise à jour de l'app,
 * ou un changement d'heure / de fuseau horaire.
 */
public class AlarmRestoreReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmRestoreReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String a = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(a)
                || "android.intent.action.QUICKBOOT_POWERON".equals(a)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)
                || Intent.ACTION_TIME_CHANGED.equals(a)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(a)
                || "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED".equals(a)) {
            Log.i(TAG, "réarmement des alarmes (" + a + ")");
            AdhanAlarms.ensureChannels(context);
            AdhanAlarms.armAll(context);
        }
    }
}
