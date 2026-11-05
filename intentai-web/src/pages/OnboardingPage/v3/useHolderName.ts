import { usePersistentStore } from '../../../data/persistentStore';
import { testerStore } from '../../../data/stores';

/** The passport holder's name: the name typed at the start screen, else W (the Figma holder). */
export default function useHolderName(): string {
  const [tester] = usePersistentStore(testerStore);
  return tester.name || 'W';
}
