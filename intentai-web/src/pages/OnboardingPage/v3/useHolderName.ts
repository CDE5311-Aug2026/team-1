import { usePersistentStore } from '../../../data/persistentStore';
import { passportNameStore } from '../../../data/v2Stores';

/** The passport holder's name from onboarding's "Whose passport is this?" (owner, 10 Nov 2026), or '' before it is
 *  given. Not the user-test name, which only labels a session. Callers show their own no-name look (no made-up "W"). */
export default function useHolderName(): string {
  const [passport] = usePersistentStore(passportNameStore);
  return passport.name.trim();
}
