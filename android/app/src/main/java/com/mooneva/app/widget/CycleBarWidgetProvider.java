package com.mooneva.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.*;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Bundle;
import android.widget.RemoteViews;
import com.mooneva.app.MainActivity;
import com.mooneva.app.R;
import org.json.*;
import java.text.SimpleDateFormat;
import java.util.*;

/** Dated snapshots are computed by the upstream web cycle model, never guessed natively. */
public class CycleBarWidgetProvider extends AppWidgetProvider {
 public static final String PREFS_NAME="mooneva_widget_prefs";
 public static final String KEY_CYCLE_DAY="cycle_day",KEY_CYCLE_LENGTH="cycle_length",KEY_DAYS_UNTIL_PERIOD="days_until_period",KEY_DAYS_UNTIL_OVULATION="days_until_ovulation",KEY_CURRENT_PHASE="current_phase",KEY_DISCRETE_MODE="discrete_mode";
 protected boolean detailed(){return false;}
 @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){for(int id:ids)render(c,m,id,detailed());}
 @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle options){render(c,m,id,detailed());}
 @Override public void onReceive(Context c,Intent i){super.onReceive(c,i);String a=i.getAction();if(Intent.ACTION_DATE_CHANGED.equals(a)||Intent.ACTION_TIME_CHANGED.equals(a)||Intent.ACTION_TIMEZONE_CHANGED.equals(a)||Intent.ACTION_BOOT_COMPLETED.equals(a))refreshAll(c);}
 public static void refreshAll(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);for(Class<?> cls:new Class<?>[]{CycleBarWidgetProvider.class,CycleTipsWidgetProvider.class})for(int id:m.getAppWidgetIds(new ComponentName(c,cls)))render(c,m,id,cls==CycleTipsWidgetProvider.class);}
 private static void render(Context c,AppWidgetManager manager,int id,boolean detailed){
  SharedPreferences p=c.getSharedPreferences(PREFS_NAME,0);
  boolean ru=p.getString("language","en").equals("ru");
  String mode=p.getString("mode","auto");boolean dark=mode.equals("dark")||(mode.equals("auto")&&(c.getResources().getConfiguration().uiMode&Configuration.UI_MODE_NIGHT_MASK)==Configuration.UI_MODE_NIGHT_YES);
  String palette=p.getString("palette","rose");int index=Arrays.asList("rose","lavender","sage","ocean","amber").indexOf(palette);if(index<0)index=0;
  String[] lightBg={"#fffdf9","#fefbff","#fcfdf7","#fbfdff","#fffcf6"}, darkBg={"#211b1a","#211924","#1c231a","#19232b","#252014"};
  String[] lightAccent={"#9d6262","#76578c","#607c5a","#416d86","#886a30"},darkAccent={"#e2b0b0","#d5b7e8","#b3cda6","#aacde4","#e0c68f"};
  int bg=Color.parseColor((dark?darkBg:lightBg)[index]),accent=Color.parseColor((dark?darkAccent:lightAccent)[index]),text=Color.parseColor(dark?"#f0e6ee":"#342d33");
  RemoteViews v=new RemoteViews(c.getPackageName(),detailed?R.layout.cycle_tips_widget:R.layout.cycle_bar_widget);
  v.setInt(R.id.widget_background,"setColorFilter",bg);
  String today=new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date());JSONObject day=null;
  try{JSONArray a=new JSONArray(p.getString("snapshots","[]"));for(int n=0;n<a.length();n++){JSONObject item=a.getJSONObject(n);if(today.equals(item.optString("date"))){day=item;break;}}}catch(JSONException ignored){}
  v.setTextViewText(R.id.cycle_day_text,day==null?"cyclone":day.optString("title"));
  v.setTextViewText(R.id.phase_text,day==null?(ru?"Открой cyclone для обновления":"Open cyclone to update"):day.optString("phase"));
  v.setTextViewText(R.id.status_text,day==null?"":day.optString("forecast"));
  v.setTextColor(R.id.cycle_day_text,text);v.setTextColor(R.id.phase_text,accent);v.setTextColor(R.id.status_text,text);
  if(detailed){int[] titles={R.id.work_title,R.id.sport_title,R.id.mood_title},bodies={R.id.work_text,R.id.sport_text,R.id.mood_text};String[] names=ru?new String[]{"Работа","Спорт","Настроение"}:new String[]{"Work","Exercise","Mood"};String[] keys={"work","sport","mood"};for(int n=0;n<3;n++){boolean showTips=day!=null&&!day.optString(keys[n]).isEmpty();v.setViewVisibility(titles[n],showTips?android.view.View.VISIBLE:android.view.View.GONE);v.setViewVisibility(bodies[n],showTips?android.view.View.VISIBLE:android.view.View.GONE);v.setTextViewText(titles[n],names[n]);v.setTextViewText(bodies[n],day==null?"":day.optString(keys[n]));v.setTextColor(titles[n],accent);v.setTextColor(bodies[n],text);}}
  Intent open=new Intent(c,MainActivity.class);open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
  v.setOnClickPendingIntent(R.id.widget_root,PendingIntent.getActivity(c,0,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));manager.updateAppWidget(id,v);
 }
}
