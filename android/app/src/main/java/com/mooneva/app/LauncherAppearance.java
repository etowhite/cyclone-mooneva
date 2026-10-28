package com.mooneva.app;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.os.Build;
import java.util.*;
public final class LauncherAppearance {
 private static final String[] PALETTES={"rose","lavender","sage","ocean","amber"};
 private static boolean registered=false;
 public static synchronized void register(Context context) {
  if(registered) return;
  Context app=context.getApplicationContext();
  IntentFilter filter=new IntentFilter(Intent.ACTION_CONFIGURATION_CHANGED);
  if(Build.VERSION.SDK_INT>=33) app.registerReceiver(new LauncherThemeReceiver(),filter,Context.RECEIVER_NOT_EXPORTED);
  else app.registerReceiver(new LauncherThemeReceiver(),filter);
  registered=true;
 }
 private static final String PREFS="cyclone_launcher";
 public static void palette(Context context,String palette) {
  if (!Arrays.asList(PALETTES).contains(palette)) throw new IllegalArgumentException("Unknown palette");
  context.getSharedPreferences(PREFS,0).edit().putString("palette",palette).apply(); apply(context);
 }
 public static void discrete(Context context,boolean enabled) {
  context.getSharedPreferences(PREFS,0).edit().putBoolean("discrete",enabled).apply(); apply(context);
 }
 public static synchronized void apply(Context context) {
  boolean dark=(context.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)==Configuration.UI_MODE_NIGHT_YES;
  android.content.SharedPreferences prefs=context.getSharedPreferences(PREFS,0);
  String palette=prefs.getString("palette","rose");
  if (!Arrays.asList(PALETTES).contains(palette)) palette="rose";
  String chosen=prefs.getBoolean("discrete",false)?"LauncherTodo":"Launcher"+palette+(dark?"Dark":"Light");
  List<String> aliases=new ArrayList<>(Arrays.asList("LauncherDefault","LauncherTodo"));
  for(String name:PALETTES) { aliases.add("Launcher"+name+"Light"); aliases.add("Launcher"+name+"Dark"); }
  PackageManager pm=context.getPackageManager();
  String ns=MainActivity.class.getPackage().getName();
  if(Build.VERSION.SDK_INT>=33) {
   List<PackageManager.ComponentEnabledSetting> updates=new ArrayList<>();
   for(String alias:aliases) {
    ComponentName component=new ComponentName(context.getPackageName(),ns+"."+alias);
    int state=alias.equals(chosen)?PackageManager.COMPONENT_ENABLED_STATE_ENABLED:PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
    if(pm.getComponentEnabledSetting(component)!=state) updates.add(new PackageManager.ComponentEnabledSetting(component,state,PackageManager.DONT_KILL_APP));
   }
   if(!updates.isEmpty()) pm.setComponentEnabledSettings(updates);
  } else {
   ComponentName component=new ComponentName(context.getPackageName(),ns+"."+chosen);
   if(pm.getComponentEnabledSetting(component)!=PackageManager.COMPONENT_ENABLED_STATE_ENABLED)
    pm.setComponentEnabledSetting(component,PackageManager.COMPONENT_ENABLED_STATE_ENABLED,PackageManager.DONT_KILL_APP);
   for(String alias:aliases) if(!alias.equals(chosen)) {
    component=new ComponentName(context.getPackageName(),ns+"."+alias);
    if(pm.getComponentEnabledSetting(component)!=PackageManager.COMPONENT_ENABLED_STATE_DISABLED)
     pm.setComponentEnabledSetting(component,PackageManager.COMPONENT_ENABLED_STATE_DISABLED,PackageManager.DONT_KILL_APP);
   }
  }
 }
}
