package com.adhan.algeria.app;

import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.provider.Settings;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AdhanAudio")
public class AdhanAudioPlugin extends Plugin {
    private static final String TAG = "AdhanAudioPlugin";
    private MediaPlayer mediaPlayer = null;
    private Vibrator vibrator = null;

    @Override
    public void load() {
        super.load();
        initVibrator();
    }

    private void initVibrator() {
        try {
            Context context = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (vm != null) {
                    vibrator = vm.getDefaultVibrator();
                }
            }
            if (vibrator == null) {
                vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not initialize Vibrator: " + e.getMessage());
        }
    }

    private AudioManager getAudioManager() {
        return (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    /**
     * Returns current physical phone ringer status:
     * - "normal": Ringtone mode active
     * - "vibrate": Vibrate mode active
     * - "silent": Silent mode active
     */
    @PluginMethod
    public void getRingerMode(PluginCall call) {
        try {
            AudioManager am = getAudioManager();
            int ringerMode = (am != null) ? am.getRingerMode() : AudioManager.RINGER_MODE_NORMAL;

            String modeStr = "normal";
            boolean canPlaySound = true;
            boolean shouldVibrate = false;

            if (ringerMode == AudioManager.RINGER_MODE_SILENT) {
                modeStr = "silent";
                canPlaySound = false;
                shouldVibrate = false;
            } else if (ringerMode == AudioManager.RINGER_MODE_VIBRATE) {
                modeStr = "vibrate";
                canPlaySound = false;
                shouldVibrate = true;
            } else {
                modeStr = "normal";
                canPlaySound = true;
                shouldVibrate = false;
            }

            float ringVolume = 1.0f;
            float mediaVolume = 1.0f;

            if (am != null) {
                try {
                    int currentRing = am.getStreamVolume(AudioManager.STREAM_RING);
                    int maxRing = am.getStreamMaxVolume(AudioManager.STREAM_RING);
                    ringVolume = maxRing > 0 ? (float) currentRing / (float) maxRing : 1.0f;

                    int currentMedia = am.getStreamVolume(AudioManager.STREAM_MUSIC);
                    int maxMedia = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                    mediaVolume = maxMedia > 0 ? (float) currentMedia / (float) maxMedia : 1.0f;
                } catch (Exception ignored) {
                }
            }

            JSObject ret = new JSObject();
            ret.put("mode", modeStr);
            ret.put("ringerModeInt", ringerMode);
            ret.put("canPlaySound", canPlaySound);
            ret.put("shouldVibrate", shouldVibrate);
            ret.put("ringVolume", ringVolume);
            ret.put("mediaVolume", mediaVolume);

            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get ringer mode: " + e.getMessage(), e);
        }
    }

    /**
     * Plays Adhan based on the physical state of the phone:
     * 1. Normal mode -> Plays sound via USAGE_NOTIFICATION_RINGTONE (Ringtone stream),
     *    ensuring Adhan is audible even if media/multimedia volume is at 0!
     * 2. Vibrate mode -> Vibrates phone with prayer pattern without sound.
     * 3. Silent mode -> Remains completely silent without sound or vibration.
     */
    @PluginMethod
    public void playAdhan(PluginCall call) {
        try {
            String soundName = call.getString("soundName", "adhan_algeria");
            if (soundName != null) {
                soundName = soundName.replace(".mp3", "")
                                     .replace("audio/", "")
                                     .replace("/audio/", "");
            } else {
                soundName = "adhan_algeria";
            }

            AudioManager am = getAudioManager();
            int ringerMode = (am != null) ? am.getRingerMode() : AudioManager.RINGER_MODE_NORMAL;

            // 1. Silent Mode -> No sound, no vibration
            if (ringerMode == AudioManager.RINGER_MODE_SILENT) {
                stopInternal();
                JSObject res = new JSObject();
                res.put("status", "silent");
                res.put("mode", "silent");
                res.put("playedSound", false);
                res.put("vibrated", false);
                res.put("message", "Phone is in Silent mode: Adhan is silenced");
                call.resolve(res);
                return;
            }

            // 2. Vibrate Mode -> Vibrate phone without sound
            if (ringerMode == AudioManager.RINGER_MODE_VIBRATE) {
                stopInternal();
                triggerPrayerVibration();
                JSObject res = new JSObject();
                res.put("status", "vibrate");
                res.put("mode", "vibrate");
                res.put("playedSound", false);
                res.put("vibrated", true);
                res.put("message", "Phone is in Vibrate mode: vibrating without sound");
                call.resolve(res);
                return;
            }

            // 3. Normal Ringer Mode -> Play Adhan on Ringtone audio stream
            stopInternal();

            Context context = getContext();
            int resId = context.getResources().getIdentifier(soundName, "raw", context.getPackageName());
            if (resId == 0) {
                // Fallback to default Algerian adhan if requested file was not found
                resId = context.getResources().getIdentifier("adhan_algeria", "raw", context.getPackageName());
            }

            if (resId == 0) {
                call.reject("Could not find audio raw resource for " + soundName);
                return;
            }

            mediaPlayer = new MediaPlayer();
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();

            mediaPlayer.setAudioAttributes(audioAttributes);

            AssetFileDescriptor afd = context.getResources().openRawResourceFd(resId);
            if (afd == null) {
                call.reject("Could not open raw resource FD for " + soundName);
                return;
            }

            mediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();

            mediaPlayer.setOnCompletionListener(mp -> {
                Log.d(TAG, "Adhan playback completed");
                stopInternal();
                notifyListeners("adhanFinished", new JSObject());
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "Adhan MediaPlayer error: what=" + what + ", extra=" + extra);
                stopInternal();
                return true;
            });

            mediaPlayer.prepare();
            mediaPlayer.start();

            JSObject res = new JSObject();
            res.put("status", "playing");
            res.put("mode", "normal");
            res.put("playedSound", true);
            res.put("vibrated", false);
            res.put("soundName", soundName);
            call.resolve(res);

        } catch (Exception e) {
            Log.e(TAG, "playAdhan exception: " + e.getMessage(), e);
            call.reject("Error playing Adhan: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stopAdhan(PluginCall call) {
        try {
            stopInternal();
            JSObject res = new JSObject();
            res.put("status", "stopped");
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Error stopping Adhan: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void isPlaying(PluginCall call) {
        boolean playing = false;
        try {
            if (mediaPlayer != null && mediaPlayer.isPlaying()) {
                playing = true;
            }
        } catch (Exception ignored) {
        }
        JSObject res = new JSObject();
        res.put("isPlaying", playing);
        call.resolve(res);
    }

    /** Indique si l'app est exemptée de l'optimisation batterie (important pour les alarmes). */
    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        boolean ignoring = true;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
                ignoring = pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
            }
        } catch (Exception e) {
            Log.w(TAG, "isIgnoringBatteryOptimizations failed: " + e.getMessage());
        }
        JSObject res = new JSObject();
        res.put("ignoring", ignoring);
        call.resolve(res);
    }

    /** Ouvre l'écran système des optimisations batterie. */
    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Cannot open battery settings: " + e.getMessage(), e);
        }
    }

    private void stopInternal() {
        try {
            if (mediaPlayer != null) {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
                mediaPlayer = null;
            }
        } catch (Exception e) {
            Log.w(TAG, "Error in stopInternal: " + e.getMessage());
            mediaPlayer = null;
        }

        try {
            if (vibrator != null) {
                vibrator.cancel();
            }
        } catch (Exception ignored) {
        }
    }

    private void triggerPrayerVibration() {
        if (vibrator == null) {
            initVibrator();
        }
        if (vibrator == null || !vibrator.hasVibrator()) {
            return;
        }

        try {
            // Distinct Islamic prayer vibration sequence: [delay, vibrate, pause, vibrate, ...]
            long[] pattern = {0, 800, 400, 800, 400, 1200, 600, 1200};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                vibrator.vibrate(pattern, -1);
            }
        } catch (Exception e) {
            Log.w(TAG, "Vibration failed: " + e.getMessage());
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopInternal();
        super.handleOnDestroy();
    }
}
