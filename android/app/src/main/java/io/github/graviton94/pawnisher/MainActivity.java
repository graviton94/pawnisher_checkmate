package io.github.graviton94.pawnisher;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/** 가로 전체 화면 (상태·내비게이션 바 숨김, 스와이프하면 잠깐 보임) */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideSystemBars();
        // 뒤로 가기 키 (D-477): 바로 앱을 닫지 않는다 — 게임(window.__hwBack)이 열린 창을 닫거나,
        // 「한 번 더 누르면 닫습니다」를 띄운다. 게임이 "exit"를 돌려줄 때만 닫는다.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() == null || getBridge().getWebView() == null) { finish(); return; }
                getBridge().getWebView().evaluateJavascript(
                    "(function(){try{return window.__hwBack?window.__hwBack():'exit'}catch(e){return 'exit'}})()",
                    value -> { if ("\"exit\"".equals(value)) finish(); });
            }
        });
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }
}
