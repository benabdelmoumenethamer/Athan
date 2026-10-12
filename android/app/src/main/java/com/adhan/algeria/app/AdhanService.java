package com.adhan.algeria.app;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

import androidx.core.content.ContextCompat;

import org.json.JSONObject;

/**
 * Service au premier plan : joue l'Adhan en entier, même application fermée,
 * et affiche une notification avec le bouton « Arrêter ».
 */
public class AdhanService extends Service {
    private static final String TAG = "AdhanService";

    public static final String ACTION_START = "com.adhan.algeria.app.ACTION_START";
    public static final String ACTION_STOP = "com.adhan.algeria.app.ACTION_STOP";
    public static final String ACTION_STOPPED = "com.adhan.algeria.app.ACTION_ADHAN_STOPPED";

    private static final int NOTIF_ID = 7001;
    private static final long MAX_DURATION_MS = 8 * 60 * 1000L;

    public static volatile boolean running = false;

    private MediaPlayer player;
    private PowerManager.WakeLock wakeLock;
    private Vibrator vibrator;
    private AudioManager audioManager;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable timeout = new Runnable() {
        @Override
        public void run() {
            stopSelf();
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        running = true;
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            // Doit quand même appeler startForeground si le service vient d'être démarré par startForegroundService
            stopSelf();
            return START_NOT_STICKY;
        }

        String json = intent != null ? intent.getStringExtra(AdhanAlarms.EXTRA_ALARM) : null;
        JSONObject o;
        try {
            o = new JSONObject(json == null ? "{}" : json);
        } catch (Exception e) {
            o = new JSONObject();
        }

        AdhanAlarms.ensureChannels(this);
        Intent stop = new Intent(this, AdhanService.class).setAction(ACTION_STOP);
        int imm = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;
        PendingIntent stopPi = PendingIntent.getService(this, 7005, stop, PendingIntent.FLAG_UPDATE_CURRENT | imm);
        Notification n = AdhanAlarms.buildServiceNotification(this, o, stopPi);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIF_ID, n);
            }
        } catch (Exception e) {
            Log.w(TAG, "startForeground refusé: " + e.getMessage());
            AdhanAlarms.postBeepNotification(this, o, true);
            stopSelf();
            return START_NOT_STICKY;
        }

        acquireWakeLock();
        handler.removeCallbacks(timeout);
        handler.postDelayed(timeout, MAX_DURATION_MS);
        startPlayback(o);
        return START_NOT_STICKY;
    }

    private void acquireWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) return;
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm == null) return;
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "adhan:playback");
            wakeLock.acquire(MAX_DURATION_MS + 10000);
        } catch (Exception e) {
            Log.w(TAG, "wakelock: " + e.getMessage());
        }
    }

    @SuppressWarnings("deprecation")
    private void startPlayback(JSONObject o) {
        releasePlayer();
        boolean respectRinger = o.optBoolean("respectRingerMode", true);
        int ringer = audioManager != null ? audioManager.getRingerMode() : AudioManager.RINGER_MODE_NORMAL;

        if (respectRinger && ringer == AudioManager.RINGER_MODE_SILENT) {
            // Téléphone en silencieux : écran + notification seulement, puis arrêt rapide
            handler.removeCallbacks(timeout);
            handler.postDelayed(timeout, 60000);
            return;
        }
        if (respectRinger && ringer == AudioManager.RINGER_MODE_VIBRATE) {
            vibrate();
            handler.removeCallbacks(timeout);
            handler.postDelayed(timeout, 60000);
            return;
        }

        String name = "adhan_" + o.optString("muezzinId", "algeria");
        int resId = getResources().getIdentifier(name, "raw", getPackageName());
        if (resId == 0) resId = getResources().getIdentifier("adhan_algeria", "raw", getPackageName());
        if (resId == 0) {
            Log.w(TAG, "aucun fichier audio trouvé pour " + name);
            vibrate();
            return;
        }

        try {
            if (audioManager != null) {
                audioManager.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
            }
            player = new MediaPlayer();
            AudioAttributes attrs = new AudioAttributes.Builder()
                    .setUsage(respectRinger ? AudioAttributes.USAGE_NOTIFICATION_RINGTONE : AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            player.setAudioAttributes(attrs);
            AssetFileDescriptor afd = getResources().openRawResourceFd(resId);
            player.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();
            player.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                @Override
                public void onCompletion(MediaPlayer mp) {
                    stopSelf();
                }
            });
            player.setOnErrorListener(new MediaPlayer.OnErrorListener() {
                @Override
                public boolean onError(MediaPlayer mp, int what, int extra) {
                    Log.w(TAG, "erreur lecture: " + what + "/" + extra);
                    stopSelf();
                    return true;
                }
            });
            player.prepare();
            player.start();
        } catch (Exception e) {
            Log.w(TAG, "lecture impossible: " + e.getMessage());
            releasePlayer();
            vibrate();
        }
    }

    @SuppressWarnings("deprecation")
    private void vibrate() {
        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator == null || !vibrator.hasVibrator()) return;
            long[] pattern = {0, 800, 400, 800, 400, 1200};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                vibrator.vibrate(pattern, -1);
            }
        } catch (Exception e) {
            Log.w(TAG, "vibration: " + e.getMessage());
        }
    }

    private void releasePlayer() {
        if (player != null) {
            try {
                if (player.isPlaying()) player.stop();
            } catch (Exception ignored) {
                // ignoré
            }
            try {
                player.release();
            } catch (Exception ignored) {
                // ignoré
            }
            player = null;
        }
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onDestroy() {
        running = false;
        handler.removeCallbacks(timeout);
        releasePlayer();
        try {
            if (vibrator != null) vibrator.cancel();
        } catch (Exception ignored) {
            // ignoré
        }
        try {
            if (audioManager != null) audioManager.abandonAudioFocus(null);
        } catch (Exception ignored) {
            // ignoré
        }
        try {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        } catch (Exception ignored) {
            // ignoré
        }
        try {
            stopForeground(true);
        } catch (Exception ignored) {
            // ignoré
        }
        // Prévient l'écran d'alerte pour qu'il se ferme
        try {
            sendBroadcast(new Intent(ACTION_STOPPED).setPackage(getPackageName()));
        } catch (Exception ignored) {
            // ignoré
        }
        super.onDestroy();
    }

    /** Arrête le service s'il tourne (appelable depuis l'UI). */
    public static void requestStop(Context ctx) {
        if (!running) return;
        try {
            ctx.startService(new Intent(ctx, AdhanService.class).setAction(ACTION_STOP));
        } catch (Exception e) {
            Log.w(TAG, "requestStop: " + e.getMessage());
        }
    }
}
