# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Pawnisher (D-635): 출시 빌드 R8 규칙
# 앱 쪽 진입점(MainActivity → BridgeActivity)은 매니페스트로 보존된다. Capacitor 플러그인 규칙은 capacitor-android의 consumer 규칙이 싣는다.
# 웹뷰 JS 다리(@JavascriptInterface)는 이름으로 불리므로 남긴다.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface,*Annotation*
# 오류 보고를 읽을 수 있게 줄 번호는 남기고 원래 파일 이름은 감춘다.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
