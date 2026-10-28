package com.mooneva.app;
import android.content.*;
public final class LauncherThemeReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context context,Intent intent) { LauncherAppearance.apply(context); }
}
