/**
 * Reproducer: RN 0.87 Android loses view registry entries.
 *
 * SurfaceMountingManager keeps its tag -> ViewState registry in
 * androidx.collection MutableIntObjectMap. androidx.collection 1.4.2 (what a
 * fresh 0.87 app resolves) corrupts that map after remove-heavy sequences;
 * androidx fixed it in 1.4.3. Plain React Native is enough to trigger it: mount
 * a batch of views, unmount some, mount more, repeat.
 *
 * How to observe: run `adb logcat | grep "Unable to find viewState"` and press
 * "Run 40 rounds". Every line is a mount instruction RN dropped because the
 * registry no longer finds a view it created and never deleted. Runs use a
 * fixed seed, so the same sequence of unmounts is replayed each time.
 *
 * @format
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
const APPEND = 70; // capped so the list never exceeds MAX
const MAX = 500;
const ROUND_DELAY_MS = 120;
const SEED = 42;

// mulberry32: small seeded PRNG, so every run replays the same unmount order.
function makeRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nextRound(ids: number[], random: () => number, nextId: number) {
  const kept = [...ids];
  for (let i = 0; i < REMOVE && kept.length > 0; i++) {
    kept.splice(Math.floor(random() * kept.length), 1);
  }
  const room = Math.max(0, MAX - kept.length);
  const count = Math.min(APPEND, room);
  const added = Array.from({ length: count }, (_, i) => nextId + i);
  return { ids: [...kept, ...added], nextId: nextId + count };
}

function App() {
  const [ids, setIds] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const state = useRef({ ids: [] as number[], nextId: 0, random: makeRandom(SEED) });

  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  }, []);

  const step = useCallback((remaining: number, done: number) => {
    const s = state.current;
    const next = nextRound(s.ids, s.random, s.nextId);
    s.ids = next.ids;
    s.nextId = next.nextId;
    setIds(next.ids);
    setRound(done + 1);
    if (remaining > 1) {
      timer.current = setTimeout(() => step(remaining - 1, done + 1), ROUND_DELAY_MS);
    } else {
      timer.current = null;
      setRunning(false);
    }
  }, []);

  const start = useCallback(
    (rounds: number) => {
      if (timer.current) {
        return;
      }
      const random = makeRandom(SEED);
      const ids = Array.from({ length: BATCH }, (_, i) => i);
      state.current = { ids, nextId: BATCH, random };
      setIds(ids);
      setRound(0);
      setRunning(true);
      timer.current = setTimeout(() => step(rounds, 0), 300);
    },
    [step],
  );

  const color = round % 2 === 0 ? '#22c55e' : '#3b82f6';
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.text}>
        Round {round}, {ids.length} views, seed {SEED}. Watch logcat for "Unable
        to find viewState". Each line is a view RN created, never deleted, and
        can no longer find.
      </Text>
      <View style={styles.row}>
        <Pressable style={styles.button} disabled={running} onPress={() => start(1)}>
          <Text style={styles.buttonText}>Run 1 round</Text>
        </Pressable>
        <Pressable style={styles.button} disabled={running} onPress={() => start(40)}>
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
  screen: { flex: 1, backgroundColor: '#111', padding: 12, paddingTop: 48, gap: 8 },
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
