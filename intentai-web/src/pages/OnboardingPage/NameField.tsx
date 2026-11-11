// The passport name field (onboarding question 1 and the review's Name sheet): the avatar shows the name's first
// letter as you type (question 1 draws it on its passport card instead), and the problem with the name (name.ts) shows once you have left the field or tried to go on.
import { useId } from 'react';
import { holderInitial } from '../../data/profile/profile';
import { NAME_MAX, nameError } from './name';
import Icon from './v3/icons';
import styles from './Onboarding.module.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Show the error now (after blur or a Continue/Save attempt). */
  showError: boolean;
  onBlur?: () => void;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  /** Draw the initial avatar beside the field (default). */
  avatar?: boolean;
}

/** The name's first letter, or a person icon while there is no letter or digit yet. */
export function Initial({ name, size }: { name: string; size: number }) {
  const initial = holderInitial(name);
  return /\p{L}|\p{N}/u.test(initial) ? <>{initial}</> : <Icon name="user" size={size} />;
}

export default function NameField({ value, onChange, showError, onBlur, autoFocus, inputRef, avatar = true }: Props) {
  const id = useId();
  const error = showError ? nameError(value) : null;
  return (
    <div className={avatar ? styles.nameField : `${styles.nameField} ${styles.nameFieldBare}`}>
      {avatar ? (
        <span className={styles.nameAvatar} aria-hidden="true">
          <Initial name={value} size={26} />
        </span>
      ) : null}
      <div className={styles.nameInputWrap}>
        <label htmlFor={`${id}-name`} className={styles.nameLabel}>
          Name on your passport
        </label>
        <input
          ref={inputRef}
          id={`${id}-name`}
          className={styles.nameInput}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoFocus={autoFocus}
          autoComplete="nickname"
          autoCapitalize="words"
          spellCheck={false}
          maxLength={NAME_MAX + 8}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
        />
        {error ? (
          <p id={`${id}-error`} className={styles.nameError} role="alert">
            {error}
          </p>
        ) : (
          <p id={`${id}-hint`} className={styles.nameHint}>
            A name or nickname, up to {NAME_MAX} characters. It stays on this phone.
          </p>
        )}
      </div>
    </div>
  );
}
