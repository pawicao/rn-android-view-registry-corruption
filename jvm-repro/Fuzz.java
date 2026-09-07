import androidx.collection.MutableIntObjectMap;
import java.util.*;
public class Fuzz {
  public static void main(String[] a) {
    int trials = Integer.parseInt(a[0]);
    Random rnd = new Random(42);
    int failures = 0; String smallest = null; int smallestOps = Integer.MAX_VALUE;
    for (int t = 0; t < trials; t++) {
      int n = 50 + rnd.nextInt(800);
      MutableIntObjectMap<Object> map = new MutableIntObjectMap<>();
      HashSet<Integer> ref = new HashSet<>();
      StringBuilder ops = new StringBuilder();
      int tag = 2 + rnd.nextInt(100) * 2; int opCount = 0; boolean failed = false;
      for (int i = 0; i < n && !failed; i++) {
        if (ref.size() > 20 && rnd.nextInt(3) == 0) {
          int burst = 1 + rnd.nextInt(Math.min(60, ref.size()));
          List<Integer> keys = new ArrayList<>(ref); Collections.shuffle(keys, rnd);
          for (int k = 0; k < burst; k++) { int key = keys.get(k); map.remove(key); ref.remove(key); ops.append("r").append(key).append(' '); opCount++; }
        } else {
          int batch = 1 + rnd.nextInt(12);
          for (int k = 0; k < batch; k++) { map.put(tag, Boolean.TRUE); ref.add(tag); ops.append("p").append(tag).append(' '); tag += 2; opCount++; }
        }
        for (int key : ref) if (!map.contains(key)) { failed = true; break; }
        if (map.getSize() != ref.size()) failed = true;
      }
      if (failed) { failures++; if (opCount < smallestOps) { smallestOps = opCount; smallest = ops.toString(); } }
    }
    System.out.println("trials=" + trials + " failures=" + failures + " smallestFailingOps=" + (smallest == null ? -1 : smallestOps));
    if (smallest != null) System.out.println("SEQ " + smallest.substring(0, Math.min(smallest.length(), 1500)));
  }
}
