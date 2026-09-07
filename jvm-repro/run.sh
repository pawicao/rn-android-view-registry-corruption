#!/bin/sh
# Runs the pure-JVM repro against androidx.collection 1.4.2 (broken) and 1.4.4 (fixed).
# Needs: javac/java 17+, curl, unzip.
set -e
cd "$(dirname "$0")"
GOOGLE=https://dl.google.com/dl/android/maven2
CENTRAL=https://repo1.maven.org/maven2
fetch() {
  # $1 = file, $2 = url. Re-downloads when the cached file is not a valid jar.
  if [ -f "$1" ] && unzip -tq "$1" >/dev/null 2>&1; then return; fi
  curl -fSL -o "$1" "$2"
  unzip -tq "$1" >/dev/null
}
for v in 1.4.2 1.4.4; do
  fetch "collection-jvm-$v.jar" "$GOOGLE/androidx/collection/collection-jvm/$v/collection-jvm-$v.jar"
done
fetch kotlin-stdlib.jar "$CENTRAL/org/jetbrains/kotlin/kotlin-stdlib/2.1.0/kotlin-stdlib-2.1.0.jar"
for v in 1.4.2 1.4.4; do
  javac -cp "collection-jvm-$v.jar" Minimal.java Fuzz.java
  echo "== androidx.collection $v"
  java -cp "collection-jvm-$v.jar:kotlin-stdlib.jar:." Minimal
  java -cp "collection-jvm-$v.jar:kotlin-stdlib.jar:." Fuzz 3000
done
