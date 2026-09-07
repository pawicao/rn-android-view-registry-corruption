/**
 * Reproducer: RN 0.87 Android loses view registry entries.
 *
 * SurfaceMountingManager keeps its tag -> ViewState registry in
 * androidx.collection MutableIntObjectMap. Versions 1.4.0 to 1.4.2 of
 * androidx.collection corrupt that map after remove-heavy sequences
 * (fixed in 1.4.3). Plain React Native is enough to trigger it: mount a
 * batch of views, unmount some, mount more, repeat.
 *
 * How to observe: run `adb logcat | grep "Unable to find viewState"` and press
 * "Run 40 rounds". Every line is a mount instruction RN dropped because the
 * registry no longer finds a view it created and never deleted.
 *
 * @format
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const BATCH = 120;
const REMOVE = 60;
const APPEND = 70;
const MAX = 500;

let nextId = 0;

function App() {
  const [ids, setIds] = useState<number[]>([]);
  const [tick, setTick] = useState(0);
  const [round, setRound] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = useCallback((remaining: number) => {
    setIds(prev => {
      const kept = [...prev];
      for (let i = 0; i < REMOVE && kept.length > 0; i++) {
        kept.splice(Math.floor(Math.random() * kept.length), 1);
      }
      const room = Math.max(0, MAX - kept.length);
      const added = Array.from(
        { length: Math.min(APPEND, room) },
        () => nextId++,
      );
      return [...kept, ...added];
    });
    setTick(t => t + 1);
    setRound(r => r + 1);
    if (remaining > 1) {
      timer.current = setTimeout(() => step(remaining - 1), 120);
    }
  }, []);

  const start = useCallback(
    (rounds: number) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      nextId = 0;
      setIds(Array.from({ length: BATCH }, () => nextId++));
      setTick(0);
      setRound(0);
      timer.current = setTimeout(() => step(rounds), 300);
    },
    [step],
  );

  const color = tick % 2 === 0 ? '#22c55e' : '#3b82f6';
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.text}>
        Round {round}. Watch logcat for "Unable to find viewState". Each line is
        a view RN created, never deleted, and can no longer find.
      </Text>
      <View style={styles.row}>
        <Pressable style={styles.button} onPress={() => start(1)}>
          <Text style={styles.buttonText}>Run 1 round</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => start(40)}>
          <Text style={styles.buttonText}>Run 40 rounds</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {ids.map(id => (
          <View key={id} style={[styles.box, { backgroundColor: color }]}>
            <Text style={styles.boxText}>{id}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#111', padding: 12, gap: 8 },
  text: { color: '#ddd', fontSize: 12 },
  row: { flexDirection: 'row', gap: 8 },
  button: { backgroundColor: '#2b6cff', padding: 10, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  box: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxText: { color: '#000', fontSize: 8 },
});

export default App;
