package com.adhan.algeria.app;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

import org.json.JSONObject;

/**
 * Écran plein écran affiché à l'heure de l'Adhan : allume l'écran, s'affiche par-dessus
 * l'écran de verrouillage et propose un gros bouton « Arrêter ».
 */
public class AdhanAlertActivity extends Activity {
    private BroadcastReceiver stopReceiver;
    private boolean receiverRegistered = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                            | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        JSONObject o;
        try {
            String json = getIntent().getStringExtra(AdhanAlarms.EXTRA_ALARM);
            o = new JSONObject(json == null ? "{}" : json);
        } catch (Exception e) {
            o = new JSONObject();
        }
        buildUi(o);

        stopReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                finish();
            }
        };
        ContextCompat.registerReceiver(
                this, stopReceiver, new IntentFilter(AdhanService.ACTION_STOPPED), ContextCompat.RECEIVER_NOT_EXPORTED);
        receiverRegistered = true;

        // Si l'Adhan est déjà terminé, inutile de rester affiché
        if (!AdhanService.running && !o.optBoolean("test", false)) {
            // le service peut démarrer juste après : on laisse l'écran ouvert quelques instants
            getWindow().getDecorView().postDelayed(new Runnable() {
                @Override
                public void run() {
                    if (!AdhanService.running && !isFinishing()) finish();
                }
            }, 4000);
        }
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    private void buildUi(JSONObject o) {
        final boolean ar = "ar".equals(o.optString("lang", "fr"));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(dp(28), dp(48), dp(28), dp(48));
        GradientDrawable bg = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM, new int[]{0xFF064E3B, 0xFF022C22, 0xFF021A14});
        root.setBackground(bg);
        root.setLayoutDirection(ar ? View.LAYOUT_DIRECTION_RTL : View.LAYOUT_DIRECTION_LTR);

        TextView heading = new TextView(this);
        heading.setText(ar ? "حان الآن موعد الصلاة" : "C'est l'heure de la prière");
        heading.setTextColor(0xFFA7F3D0);
        heading.setTextSize(18);
        heading.setGravity(Gravity.CENTER);
        root.addView(heading, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView name = new TextView(this);
        name.setText(AdhanAlarms.prayerTitle(o));
        name.setTextColor(0xFFFBBF24);
        name.setTextSize(52);
        name.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        name.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams nameLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        nameLp.topMargin = dp(16);
        root.addView(name, nameLp);

        TextView time = new TextView(this);
        time.setText(AdhanAlarms.formatTime(o));
        time.setTextColor(Color.WHITE);
        time.setTextSize(30);
        time.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams timeLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        timeLp.topMargin = dp(8);
        root.addView(time, timeLp);

        Button stop = new Button(this);
        stop.setText(ar ? "إيقاف الأذان" : "Arrêter l'Adhan");
        stop.setTextSize(20);
        stop.setTextColor(0xFF022C22);
        stop.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        stop.setAllCaps(false);
        GradientDrawable stopBg = new GradientDrawable();
        stopBg.setColor(0xFFFBBF24);
        stopBg.setCornerRadius(dp(28));
        stop.setBackground(stopBg);
        stop.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                AdhanService.requestStop(AdhanAlertActivity.this);
                finish();
            }
        });
        LinearLayout.LayoutParams stopLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(64));
        stopLp.topMargin = dp(56);
        root.addView(stop, stopLp);

        Button open = new Button(this);
        open.setText(ar ? "فتح التطبيق" : "Ouvrir l'application");
        open.setTextSize(15);
        open.setTextColor(0xFFA7F3D0);
        open.setAllCaps(false);
        GradientDrawable openBg = new GradientDrawable();
        openBg.setColor(Color.TRANSPARENT);
        openBg.setStroke(dp(1), 0xFF047857);
        openBg.setCornerRadius(dp(24));
        open.setBackground(openBg);
        open.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent i = new Intent(AdhanAlertActivity.this, MainActivity.class);
                i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                startActivity(i);
                finish();
            }
        });
        LinearLayout.LayoutParams openLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(52));
        openLp.topMargin = dp(16);
        root.addView(open, openLp);

        setContentView(root);
    }

    @Override
    protected void onDestroy() {
        if (receiverRegistered) {
            try {
                unregisterReceiver(stopReceiver);
            } catch (Exception ignored) {
                // ignoré
            }
        }
        super.onDestroy();
    }
}
