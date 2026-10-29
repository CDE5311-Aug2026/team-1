import { usePersistentStore } from '../../../data/persistentStore';
import { testerStore } from '../../../data/stores';

/** The passport holder's initial: the first letter of the user-test name, else W (the Figma holder). */
export default function useInitial(): string {
  const [tester] = usePersistentStore(testerStore);
  const letter = tester.name.normalize('NFKC').match(/[A-Za-z]/)?.[0];
  return (letter ?? 'W').toUpperCase();
}
