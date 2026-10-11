# صقور العراق — نسخة أوفلاين (أندرويد)

## الهيكل
- `source/index.html` — ملف التطبيق الأصلي (عدّل هنا فقط)
- `scripts/` — سكربتات التجهيز (خطوط، بلاطات العراق، تجهيز الويب، تجهيز أندرويد)
- `native/OfflineTilesPlugin.java` — قارئ ملف الخريطة داخل الـAPK
- `.github/workflows/build-android.yml` — بناء الـAPK على GitHub (Actions → Run workflow)

## التشغيل محلياً
المتطلبات: Node 22 و Java 21 و Android SDK.

    npm install
    npm run build:android
    cd android && ./gradlew assembleDebug

الناتج: `android/app/build/outputs/apk/debug/app-debug.apk`

## تصغير الحجم
ملف الخريطة يكبر مع مستوى التقريب. الافتراضي 14. للتصغير:

    IRAQ_MAXZOOM=13 npm run build:android      # أو 12

## بعد تعديل index.html
عدّل `source/index.html` ثم أعد `npm run build:web` ثم `npx cap sync android`، وابنِ الـAPK.
