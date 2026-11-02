import { usePersistentStore } from '../data/persistentStore';
import { testerStore, versionOf, type TestVersion } from '../data/stores';

/** The user-test version this phone runs: A has no Hunt tab, B is the full app. */
export default function useTestVersion(): TestVersion {
  const [tester] = usePersistentStore(testerStore);
  return versionOf(tester);
}
