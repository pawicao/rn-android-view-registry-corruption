# RN 0.87 Android: view registry loses entries with androidx.collection 1.4.0 to 1.4.2

`SurfaceMountingManager` stores its tag to `ViewState` registry in
`androidx.collection.MutableIntObjectMap` since React Native 0.87.0
(facebook/react-native#56646, flag removed in #57228). `androidx.collection`
1.4.0 to 1.4.2 corrupt `ScatterMap` and its primitive variants after
remove-heavy sequences. The fix shipped in 1.4.3
(https://developer.android.com/jetpack/androidx/releases/collection#1.4.3).
React Native pins 1.4.0, and a plain app resolves 1.4.0 or 1.4.2.

Effect: a view RN created and never deleted can no longer be found. RN then
drops every later mount instruction for it, with a soft exception in debug and
silently in release. Updates stop, removals and deletions are skipped, and
child inserts into it are skipped.

## App reproducer

1. `cd ReproducerApp && yarn && yarn android`
2. `adb logcat | grep "Unable to find viewState"`
3. Press **Run 40 rounds**. Each round unmounts 60 random views and mounts 70.

Observed on a Pixel 9a, Android 16: 60 soft exceptions on 27 distinct tags in
one run (`updateLayout`, `updateProps`, `deleteView`).

## Pure JVM reproducer, 37 operations

```sh
./jvm-repro/run.sh
```

`Minimal.java` puts 28 even keys, removes 6, puts 3 more. With 1.4.2 two keys
become unreachable while `size` still counts them. `Fuzz.java` shows about
half of random put and remove sequences fail on 1.4.2 and none on 1.4.4.

## Confirming the fix

Add to `ReproducerApp/android/app/build.gradle`:

```groovy
dependencies {
    implementation("androidx.collection:collection:1.4.4")
}
```

With that pin the app reproducer logs nothing over 120 rounds.
