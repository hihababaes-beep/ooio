# صقور العراق — خريطة Android أوفلاين

هذا المشروع يغلّف نسخة HTML في Capacitor، ويُنشئ حزمة بلاطات متجهية للعراق بصيغة PMTiles ويضمّنها داخل APK. التغطية المتوسطة تصل إلى مستوى التكبير 14، وتشمل بيانات الطرق والمدن من OpenStreetMap. يقرأ مكوّن Android المضمّن نطاقات البايت مباشرة من ملف الخريطة حتى لا يضطر التطبيق إلى تحميل الأرشيف كاملًا إلى الذاكرة.

## إنشاء APK عبر GitHub Actions

1. ارفع **محتويات هذا المجلد** إلى مستودع GitHub جديد أو موجود.
2. افتح تبويب **Actions** وشغّل **Build Iraq offline Android app** عبر **Run workflow**.
3. بعد نجاح البناء، نزّل artifact باسم `sqoor-iraq-offline`؛ يحتوي APK وملف `iraq.pmtiles` الناتج.

يستغرق إنشاء بلاطات العراق وقتًا ويحتاج ذاكرة ومساحة مؤقتة؛ لذلك ينفّذه GitHub Actions على خادمه بدل جهاز سطح المكتب. لا تُضاف حزمة PMTiles الضخمة إلى سجل Git. ملف الخريطة الذي ينشئه الإجراء يُضمّن في APK ويُرفق أيضًا كـartifact قابل للتنزيل لمدة 30 يومًا.

## بناء محلي

يتطلب Node.js 22 أو أحدث وJava 21 أو أحدث وAndroid SDK. من هذا المجلد شغّل:

```sh
npm install
npm run build:android
cd android
./gradlew assembleDebug
```

على Windows استخدم `.\gradlew.bat assembleDebug` بدل `./gradlew assembleDebug`.

## حدود العمل دون إنترنت

- خريطة الشوارع والمدينة وملصقاتها تعمل من الحزمة المحلية بعد تثبيت APK؛ لا تحتاج إلى تنزيل البلاطات أثناء الاستخدام.
- البحث الجغرافي والخدمات الحية والطقس وFirebase، وصور الأقمار الصناعية والتضاريس، ما زالت تعتمد على الإنترنت ومصادرها الأصلية.
- لا يضمّن هذا البناء صور أقمار صناعية؛ المطلوب هنا خريطة شوارع متوسطة التفاصيل للعراق.

## مصادر البيانات والنسبة

- بيانات الطرق والمواقع: [Geofabrik Iraq](https://download.geofabrik.de/asia/iraq.html)، وهي مستخرجة من [OpenStreetMap](https://www.openstreetmap.org/copyright).
- إنشاء البلاطات: [Planetiler](https://github.com/onthegomap/planetiler) باستخدام مخطط OpenMapTiles.
- بيانات OpenStreetMap منشورة وفق [رخصة ODbL](https://opendatacommons.org/licenses/odbl/). تعرض الخريطة نسبة المصدر داخل عنصر MapLibre للإسناد.
- ملفات تشكيل الحروف العربية تُنزّل من [OpenFreeMap](https://openfreemap.org/) أثناء إعداد الويب وتُضمّن محليًا.
