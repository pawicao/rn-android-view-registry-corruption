#!/bin/sh
# Runs the pure-JVM repro against androidx.collection 1.4.2 (broken) and 1.4.4 (fixed).
# Needs: javac/java 17+, curl.
set -e
cd "$(dirname "$0")"
MAVEN=https://repo1.maven.org/maven2
for v in 1.4.2 1.4.4; do
  [ -f "collection-jvm-$v.jar" ] || curl -sSLo "collection-jvm-$v.jar" "$MAVEN/androidx/collection/collection-jvm/$v/collection-jvm-$v.jar"
done
[ -f kotlin-stdlib.jar ] || curl -sSLo kotlin-stdlib.jar "$MAVEN/org/jetbrains/kotlin/kotlin-stdlib/2.1.0/kotlin-stdlib-2.1.0.jar"
for v in 1.4.2 1.4.4; do
  javac -cp "collection-jvm-$v.jar" Minimal.java Fuzz.java
  echo "== androidx.collection $v"
  java -cp "collection-jvm-$v.jar:kotlin-stdlib.jar:." Minimal
  java -cp "collection-jvm-$v.jar:kotlin-stdlib.jar:." Fuzz 3000
done
