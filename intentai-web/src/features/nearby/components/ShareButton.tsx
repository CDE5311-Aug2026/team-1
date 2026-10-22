// One share button (a place, a checklist): the share sheet, or the link copied, with a toast saying which.
import { useState } from 'react';
import { showToast } from '../../../hooks/useToast';
import { shareContent, shareToast, type ShareContent } from '../share';
import { Icon } from './icons';

export default function ShareButton({ label, content, className, size = 20 }: { label: string; content: () => ShareContent; className?: string; size?: number }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const note = shareToast(await shareContent(content()));
          if (note) showToast(note);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Icon name="share" size={size} />
    </button>
  );
}
