import androidx.collection.MutableIntObjectMap;
public class Minimal {
  public static void main(String[] a) {
    MutableIntObjectMap<String> map = new MutableIntObjectMap<>();
    for (int k = 120; k <= 174; k += 2) map.put(k, "v" + k);      // 28 puts
    for (int k : new int[] {174, 160, 150, 136, 146, 124}) map.remove(k); // 6 removes
    for (int k : new int[] {176, 178, 180}) map.put(k, "v" + k);   // 3 puts
    int lost = 0;
    for (int k = 120; k <= 180; k += 2) {
      boolean expected = !(k == 174 || k == 160 || k == 150 || k == 136 || k == 146 || k == 124);
      if (expected && map.get(k) == null) { lost++; System.out.println("lost key " + k); }
    }
    System.out.println("size=" + map.getSize() + " expected=" + 25 + " lost=" + lost);
  }
}
