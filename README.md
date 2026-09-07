# RN 0.87 Android: view registry loses entries with androidx.collection 1.4.0 to 1.4.2

`SurfaceMountingManager` stores its tag to `ViewState` registry in
`androidx.collection.MutableIntObjectMap` since React Native 0.87.0
(facebook/react-native#56646, flag removed in #57228). `androidx.collection`
1.4.0 to 1.4.2 corrupt `ScatterMap` and its primitive variants after
remove-heavy sequences. The fix shipped in 1.4.3
(https://developer.android.com/jetpack/androidx/releases/collection#1.4.3).
React Native pins 1.4.0, and a plain app resolves 1.4.0 or 1.4.2.

Effect: a view RN created and never deleted can no longer be found in the
registry. RN then logs `Unable to find viewState for tag N` and skips the
instruction that needed it: prop and layout updates for that view, `deleteView`
of it, and child inserts or removals that look up the view as the parent.

## App reproducer

1. `cd ReproducerApp && yarn && yarn android`
2. `adb logcat | grep "Unable to find viewState"`
3. Press **Run 40 rounds**. Each round unmounts 60 random views and mounts 70.

Observed on a Pixel 9a, Android 16, with this app (seed 42): 91 soft exceptions
on 45 distinct tags in two runs of 40 rounds (68 `updateLayout`, 6 `updateProps`,
17 `deleteView`). A visible symptom from the same run: box 2171 stayed on screen
on top of box 2451 after RN could no longer find it in the registry, see
`docs/zombie-view-2171-over-2451.png`. Check the resolved version with
`cd android && ./gradlew :app:dependencies --configuration debugRuntimeClasspath | grep androidx.collection`;
this app resolves 1.4.2 through `androidx.core` and `androidx.window`.

## Pure JVM reproducer, 37 operations

```sh
./jvm-repro/run.sh
```

`Minimal.java` puts 28 even keys, removes 6, puts 3 more. With 1.4.2 two keys
become unreachable while `size` still counts them. `Fuzz.java` shows about
half of random put and remove sequences fail on 1.4.2 and none on 1.4.4.
The script downloads the two `collection-jvm` jars from Google's Maven
repository and the Kotlin stdlib from Maven Central.

## Confirming the fix

Add to `ReproducerApp/android/app/build.gradle`:

```groovy
dependencies {
    implementation("androidx.collection:collection:1.4.4")
}
```

With that pin, the same screen inside a larger app logged nothing over 120
rounds on the same device. Tested against 1.4.2 and 1.4.4 only; 1.4.0 and 1.4.1
were not tested.
