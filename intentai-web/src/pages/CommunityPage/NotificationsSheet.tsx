// Notifications (ZIP renderCommunityNotifications): replies and mentions, All / Unread, Mark all read, and opening
// one goes to that reply in its thread. Read state is kept on this device.
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { communitySocialStore, timeAgo, type CommunityNotification } from '../../data/community/social';
import { paths } from '../../routes';
import { Avatar, ExampleTag } from './bits';
import { Icon } from './icons';
import Sheet from './Sheet';
import styles from './NotificationsSheet.module.css';

export interface ThreadFocusState {
  focusReply?: string;
}

export default function NotificationsSheet({ items, onClose }: { items: CommunityNotification[]; onClose: () => void }) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();
  const unread = items.filter((n) => n.unread).length;
  const shown = filter === 'unread' ? items.filter((n) => n.unread) : items;

  const markRead = (ids: string[]) =>
    communitySocialStore.set((prev) => ({ ...prev, readNotifications: [...new Set([...prev.readNotifications, ...ids])] }));

  const open = (item: CommunityNotification) => {
    markRead([item.id]);
    onClose();
    navigate(paths.question(item.threadId), { state: { focusReply: item.replyId } satisfies ThreadFocusState });
  };

  return (
    <Sheet title="Notifications" onClose={onClose} wide>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Filter notifications">
          <button type="button" className={filter === 'all' ? styles.tabOn : styles.tab} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </button>
          <button type="button" className={filter === 'unread' ? styles.tabOn : styles.tab} aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>
            Unread
            {unread > 0 && <span className={styles.tabCount}>{unread}</span>}
          </button>
        </div>
        <button type="button" className={styles.markRead} disabled={unread === 0} onClick={() => markRead(items.map((n) => n.id))}>
          <Icon name="check" size={14} />
          Mark all read
        </button>
      </div>

      <ul className={styles.list} aria-label={filter === 'unread' ? 'Unread notifications' : 'All notifications'}>
        <AnimatePresence initial={false}>
          {shown.map((item, i) => {
            const label = `${item.unread ? 'Unread. ' : ''}${item.actor} ${verbFor(item)}. ${item.threadTitle}`;
            return (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                exit={{ opacity: 0, height: 0 }}
              >
                <button type="button" className={item.unread ? `${styles.item} ${styles.unread}` : styles.item} aria-label={label} onClick={() => open(item)}>
                  <span className={styles.avatar}>
                    <Avatar name={item.actor} />
                    <span className={styles.kind}>
                      <Icon name={item.kind === 'mention' ? 'person' : 'chat'} size={11} strokeWidth={2} />
                    </span>
                  </span>
                  <span className={styles.body}>
                    <span className={styles.event}>
                      <strong>{item.actor}</strong> {verbFor(item)}
                      {item.unread && <span className={styles.dot} aria-hidden="true" />}
                    </span>
                    <span className={styles.thread}>{item.threadTitle}</span>
                    <span className={styles.excerpt}>{item.text}</span>
                    <span className={styles.foot}>
                      {timeAgo(item.at) && <span>{timeAgo(item.at)}</span>}
                      {item.sample && <ExampleTag />}
                    </span>
                  </span>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {shown.length === 0 && (
        <div className={styles.empty}>
          <Icon name="bell" size={22} />
          <strong>{filter === 'unread' ? 'You’re all caught up.' : 'No notifications yet.'}</strong>
          <p>Replies to your questions and mentions will appear here.</p>
        </div>
      )}
    </Sheet>
  );
}

export function verbFor(item: CommunityNotification): string {
  if (item.kind === 'mention') return 'mentioned you in a reply';
  return item.id.startsWith('answer:') ? 'replied to your question' : 'replied in a conversation';
}
