package com.mooneva.app;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
public final class LauncherEntryActivity extends Activity {
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  startActivity(new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP));
  finish();
 }
}
