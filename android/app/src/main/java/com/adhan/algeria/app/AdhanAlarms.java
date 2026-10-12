package com.adhan.algeria.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Stockage + planification des alarmes d'Adhan (AlarmManager) et fabrication des notifications.
 * Les alarmes sont conservées en SharedPreferences afin d'être réarmées après un redémarrage.
 */
public final class AdhanAlarms {
    private static final String TAG = "AdhanAlarms";
    private static final String PREFS = "adhan_alarms";
    private static final String KEY_ALARMS = "alarms_json";
    private static final String KEY_STALE_DAY = "stale_notif_day";

    public static final String ACTION_FIRE = "com.adhan.algeria.app.ACTION_FIRE";
    public static final String EXTRA_ALARM = "alarm";

    // Canaux de notification
    public static final String CH_SERVICE = "adhan_alarm_v1"; // notification du service (silencieuse, importance haute)
    public static final String CH_PRE = "adhan_pre_v2"; // rappel avant la prière
    public static final String CH_BEEP = "adhan_beep_v1"; // notification simple avec son par défaut
    public static final String CH_INFO = "adhan_info_v1"; // informations (renouvellement des alarmes)

    public static final int NOTIF_PRE_BASE = 20000;
    public static final int NOTIF_INFO = 29000;
    public static final int TEST_ID = 999001;

    private AdhanAlarms() {}

    // ------------------------------------------------------------------ stockage

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static JSONArray load(Context ctx) {
        try {
            String raw = prefs(ctx).getString(KEY_ALARMS, "[]");
            return new JSONArray(raw);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    private static void save(Context ctx, JSONArray arr) {
        prefs(ctx).edit().putString(KEY_ALARMS, arr.toString()).apply();
    }

    // -------------------------------------------------------------- planification

    /** Remplace toutes les alarmes existantes par la nouvelle liste. */
    public static void saveAndSchedule(Context ctx, JSONArray alarms) {
        cancelAll(ctx);
        save(ctx, alarms);
        armAll(ctx);
    }

    /** Annule toutes les alarmes enregistrées. */
    public static void cancelAll(Context ctx) {
        JSONArray old = load(ctx);
        for (int i = 0; i < old.length(); i++) {
            JSONObject o = old.optJSONObject(i);
            if (o != null) cancelOne(ctx, o.optInt("id"));
        }
        save(ctx, new JSONArray());
    }

    /** Arme toutes les alarmes futures du stockage (appelé aussi après redémarrage). */
    public static void armAll(Context ctx) {
        JSONArray all = load(ctx);
        JSONArray keep = new JSONArray();
        long now = System.currentTimeMillis();
        int armed = 0;
        for (int i = 0; i < all.length(); i++) {
            JSONObject o = all.optJSONObject(i);
            if (o == null) continue;
            if (o.optLong("at") > now) {
                try {
                    arm(ctx, o);
                    armed++;
                } catch (Exception e) {
                    Log.w(TAG, "arm failed: " + e.getMessage());
                }
                keep.put(o);
            }
        }
        save(ctx, keep);
        Log.i(TAG, "armAll: " + armed + " alarme(s) armée(s)");
    }

    private static Intent fireIntent(Context ctx, int id, JSONObject o) {
        Intent intent = new Intent(ctx, AdhanAlarmReceiver.class);
        intent.setAction(ACTION_FIRE);
        intent.setData(Uri.parse("adhan://alarm/" + id));
        if (o != null) intent.putExtra(EXTRA_ALARM, o.toString());
        return intent;
    }

    private static int immutableFlag() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;
    }

    /** Arme une alarme unique (non stockée si appelée directement, ex. test). */
    public static void arm(Context ctx, JSONObject o) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        int id = o.optInt("id");
        long at = o.optLong("at");
        PendingIntent pi = PendingIntent.getBroadcast(
                ctx, id, fireIntent(ctx, id, o), PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag());

        if ("pre".equals(o.optString("kind"))) {
            boolean exactOk = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms();
            if (exactOk) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            } else {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            }
        } else {
            // setAlarmClock : traité comme un vrai réveil (exempté du mode Doze, aucune permission spéciale)
            Intent open = new Intent(ctx, MainActivity.class);
            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent show = PendingIntent.getActivity(
                    ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag());
            am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), pi);
        }
    }

    private static void cancelOne(Context ctx, int id) {
        try {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            PendingIntent pi = PendingIntent.getBroadcast(
                    ctx, id, fireIntent(ctx, id, null), PendingIntent.FLAG_NO_CREATE | immutableFlag());
            if (pi != null) {
                am.cancel(pi);
                pi.cancel();
            }
        } catch (Exception e) {
            Log.w(TAG, "cancelOne failed: " + e.getMessage());
        }
    }

    /** Nombre d'Adhans encore programmés dans le futur. */
    public static int countUpcomingAdhan(Context ctx) {
        JSONArray all = load(ctx);
        long now = System.currentTimeMillis();
        int n = 0;
        for (int i = 0; i < all.length(); i++) {
            JSONObject o = all.optJSONObject(i);
            if (o != null && "adhan".equals(o.optString("kind")) && o.optLong("at") > now) n++;
        }
        return n;
    }

    // ------------------------------------------------------------------ écran

    /** Allume l'écran quelques secondes (même verrouillé). */
    @SuppressWarnings("deprecation")
    public static void wakeScreen(Context ctx, long millis) {
        try {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            if (pm == null) return;
            PowerManager.WakeLock wl = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK
                            | PowerManager.ACQUIRE_CAUSES_WAKEUP
                            | PowerManager.ON_AFTER_RELEASE,
                    "adhan:screen");
            wl.acquire(millis);
        } catch (Exception e) {
            Log.w(TAG, "wakeScreen failed: " + e.getMessage());
        }
    }

    // ------------------------------------------------------------ notifications

    public static void ensureChannels(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        NotificationChannel service = new NotificationChannel(
                CH_SERVICE, "Adhan (lecture en cours)", NotificationManager.IMPORTANCE_HIGH);
        service.setDescription("Notification affichée pendant la lecture de l'Adhan");
        service.setSound(null, null);
        service.enableVibration(false);
        service.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(service);

        NotificationChannel pre = new NotificationChannel(
                CH_PRE, "Rappels avant la prière", NotificationManager.IMPORTANCE_HIGH);
        pre.setDescription("Rappel quelques minutes avant l'Adhan");
        nm.createNotificationChannel(pre);

        NotificationChannel beep = new NotificationChannel(
                CH_BEEP, "Alerte simple (sans Adhan)", NotificationManager.IMPORTANCE_HIGH);
        beep.setDescription("Notification sonore courte à l'heure de la prière");
        nm.createNotificationChannel(beep);

        NotificationChannel info = new NotificationChannel(
                CH_INFO, "Informations", NotificationManager.IMPORTANCE_LOW);
        info.setDescription("Informations sur l'application");
        nm.createNotificationChannel(info);
    }

    private static boolean isArabic(JSONObject o) {
        return "ar".equals(o.optString("lang", "fr"));
    }

    public static String prayerTitle(JSONObject o) {
        return isArabic(o) ? o.optString("titleAr", "الصلاة") : o.optString("titleFr", "Prière");
    }

    public static String formatTime(JSONObject o) {
        return new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date(o.optLong("at")));
    }

    private static PendingIntent openAppIntent(Context ctx, int requestCode) {
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, requestCode, open, PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag());
    }

    public static PendingIntent alertActivityIntent(Context ctx, JSONObject o) {
        Intent i = new Intent(ctx, AdhanAlertActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        i.putExtra(EXTRA_ALARM, o.toString());
        return PendingIntent.getActivity(ctx, 7002, i, PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag());
    }

    /** Notification du service au premier plan (écran plein + bouton Arrêter). */
    public static Notification buildServiceNotification(Context ctx, JSONObject o, PendingIntent stopIntent) {
        boolean ar = isArabic(o);
        String title = ar ? "حان الآن موعد صلاة " + prayerTitle(o) : "C'est l'heure de la prière de " + prayerTitle(o);
        String text = ar ? "حي على الصلاة، حي على الفلاح" : "Accourez à la prière, accourez au succès";
        PendingIntent alert = alertActivityIntent(ctx, o);

        return new NotificationCompat.Builder(ctx, CH_SERVICE)
                .setSmallIcon(R.drawable.ic_stat_adhan)
                .setContentTitle(title)
                .setContentText(text)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setColor(0xFF064E3B)
                .setContentIntent(alert)
                .setFullScreenIntent(alert, true)
                .addAction(0, ar ? "إيقاف الأذان" : "Arrêter l'Adhan", stopIntent)
                .build();
    }

    private static void notify(Context ctx, int id, Notification n) {
        try {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(id, n);
        } catch (SecurityException e) {
            Log.w(TAG, "notify refused (permission): " + e.getMessage());
        }
    }

    /** Rappel avant la prière. */
    public static void postPreNotification(Context ctx, JSONObject o) {
        ensureChannels(ctx);
        boolean ar = isArabic(o);
        int min = o.optInt("minutes", 10);
        String title = ar ? "اقتراب صلاة " + prayerTitle(o) : "Rappel : prière de " + prayerTitle(o) + " imminente";
        String text = ar
                ? "بقي " + min + " دقيقة على موعد الأذان"
                : "Plus que " + min + " minutes avant l'Adhan";
        Notification n = new NotificationCompat.Builder(ctx, CH_PRE)
                .setSmallIcon(R.drawable.ic_stat_adhan)
                .setContentTitle(title)
                .setContentText(text)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setColor(0xFF064E3B)
                .setAutoCancel(true)
                .setContentIntent(openAppIntent(ctx, 7003))
                .build();
        notify(ctx, NOTIF_PRE_BASE + (o.optInt("id") % 1000), n);
    }

    /** Alerte sonore simple (prière dont l'Adhan complet est désactivé) ou repli si le service est refusé. */
    public static void postBeepNotification(Context ctx, JSONObject o, boolean withFullScreen) {
        ensureChannels(ctx);
        boolean ar = isArabic(o);
        String title = ar ? "حان الآن موعد صلاة " + prayerTitle(o) : "C'est l'heure de la prière de " + prayerTitle(o);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CH_BEEP)
                .setSmallIcon(R.drawable.ic_stat_adhan)
                .setContentTitle(title)
                .setContentText(formatTime(o))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setColor(0xFF064E3B)
                .setAutoCancel(true)
                .setDefaults(NotificationCompat.DEFAULT_ALL);
        if (withFullScreen) {
            PendingIntent alert = alertActivityIntent(ctx, o);
            b.setContentIntent(alert).setFullScreenIntent(alert, true);
        } else {
            b.setContentIntent(openAppIntent(ctx, 7003));
        }
        notify(ctx, NOTIF_PRE_BASE + 500 + (o.optInt("id") % 400), b.build());
    }

    /** Si presque plus d'alarmes en réserve, invite à rouvrir l'app (au plus une fois par jour). */
    public static void maybeNotifyStale(Context ctx) {
        try {
            if (countUpcomingAdhan(ctx) >= 10) return;
            String today = new SimpleDateFormat("yyyyMMdd", Locale.US).format(new Date());
            SharedPreferences p = prefs(ctx);
            if (today.equals(p.getString(KEY_STALE_DAY, ""))) return;
            p.edit().putString(KEY_STALE_DAY, today).apply();

            ensureChannels(ctx);
            Notification n = new NotificationCompat.Builder(ctx, CH_INFO)
                    .setSmallIcon(R.drawable.ic_stat_adhan)
                    .setContentTitle("Adhan – أوقات الصلاة")
                    .setContentText("Ouvrez l'application pour renouveler les rappels de prière / افتح التطبيق لتجديد التنبيهات")
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setAutoCancel(true)
                    .setContentIntent(openAppIntent(ctx, 7004))
                    .build();
            notify(ctx, NOTIF_INFO, n);
        } catch (Exception e) {
            Log.w(TAG, "maybeNotifyStale failed: " + e.getMessage());
        }
    }
}
