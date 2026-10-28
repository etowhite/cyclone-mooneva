package com.mooneva.app;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
@CapacitorPlugin(name="AppIcon")
public class AppIconPlugin extends Plugin {
 @PluginMethod public void setIcon(PluginCall call) {
  String name=call.getString("name");
  if(!"Todo".equals(name)&&!"Default".equals(name)) { call.reject("Unknown icon"); return; }
  try { LauncherAppearance.discrete(getContext(),false); call.resolve(); }
  catch(Exception error) { call.reject("Cannot switch launcher icon",error); }
 }
 @PluginMethod public void setAppearance(PluginCall call) {
  try { LauncherAppearance.palette(getContext(),call.getString("palette","rose")); call.resolve(); }
  catch(Exception error) { call.reject("Cannot update icon palette",error); }
 }
}
