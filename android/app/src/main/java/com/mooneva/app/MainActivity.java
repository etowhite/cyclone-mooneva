package com.mooneva.app;

import com.getcapacitor.BridgeActivity;
import com.mooneva.app.widget.WidgetSyncPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(AppIconPlugin.class);
        registerPlugin(ExactAlarmPlugin.class);
        registerPlugin(WidgetSyncPlugin.class);
        registerPlugin(BackupFolderPlugin.class);
        super.onCreate(savedInstanceState);
        LauncherAppearance.register(this);
        LauncherAppearance.apply(this);
    }
    @Override public void onConfigurationChanged(android.content.res.Configuration config) {
        super.onConfigurationChanged(config);
        LauncherAppearance.apply(this);
    }
}
