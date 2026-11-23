import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Lock, Mail, MailOpen, RefreshCw, RotateCcw, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { vault as t } from '../../content/vault';
import { EXPERIENCE_EPOCH_KEY, clearVisitorProgress, startUrl } from '../../utils/experienceState';
import { VAULT_ENDPOINT } from '../../utils/hosting';
import { TIMEZONE } from '../../utils/timezone';
import { VaultError, createVaultClient, type VaultWish } from '../../vault/vaultClient';
import './RoyalWishVault.css';

interface Props {
  onClose: () => void;
}

const when = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const formatWhen = (ms: number) => `${when.format(new Date(ms))} (Mauritius)`;

type Confirm = { kind: 'delete'; id: string } | { kind: 'reset' } | null;

/**
 * THE ROYAL WISH VAULT – the owner's private inbox and control room.
 * Opened only by the hidden five-tap gesture; every action is checked by the
 * server. The session token is held in this component's memory only.
 */
export default function RoyalWishVault({ onClose }: Props) {
  const reduced = useReducedMotion();
  const client = useMemo(() => createVaultClient(VAULT_ENDPOINT), []);
  const [token, setToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [wishes, setWishes] = useState<VaultWish[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [resetDone, setResetDone] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  const fail = useCallback((e: unknown) => {
    const code = e instanceof VaultError ? e.code : 'generic';
    if (code === 'unauthorised') {
      setToken(null);
      setWishes([]);
      setOpenId(null);
    }
    setError(t.errors[code] ?? t.errors.generic);
  }, []);

  const refresh = useCallback(
    async (tk = tokenRef.current) => {
      if (!tk) return;
      setBusy(true);
      try {
        setWishes(await client.list(tk));
        setError('');
      } catch (e) {
        fail(e);
      } finally {
        setBusy(false);
      }
    },
    [client, fail],
  );

  // Close: revoke the session server-side (best effort) and forget it.
  const close = useCallback(() => {
    const tk = tokenRef.current;
    if (tk) client.logout(tk).catch(() => {});
    setToken(null);
    onClose();
  }, [client, onClose]);

  useEffect(() => {
    codeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirm) setConfirm(null);
      else close();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [close, confirm]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setBusy(true);
    setError('');
    try {
      const tk = await client.login(code);
      setCode('');
      setToken(tk);
      await refresh(tk);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const open = async (w: VaultWish) => {
    setOpenId(w.id);
    if (!w.read && token) {
      // Opening a wish marks it as read.
      setWishes((list) => list.map((x) => (x.id === w.id ? { ...x, read: true } : x)));
      client.mark(token, w.id, true).catch(fail);
    }
  };

  const toggleRead = async (w: VaultWish) => {
    if (!token) return;
    try {
      await client.mark(token, w.id, !w.read);
      setWishes((list) => list.map((x) => (x.id === w.id ? { ...x, read: !w.read } : x)));
    } catch (e) {
      fail(e);
    }
  };

  const doDelete = async (id: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await client.remove(token, id);
      setWishes((list) => list.filter((x) => x.id !== id));
      setOpenId(null);
      setConfirm(null);
    } catch (e) {
      fail(e);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const doReset = async () => {
    if (!token) return;
    setBusy(true);
    try {
      // 1. Server: new experience epoch (wishes untouched) → every device resets.
      const epoch = await client.resetExperience(token);
      // 2. This device: clear all visitor progress, remember the new epoch.
      clearVisitorProgress();
      try {
        localStorage.setItem(EXPERIENCE_EPOCH_KEY, epoch);
      } catch {
        /* ignore */
      }
      // 3. Log out, confirm, and return to the very beginning.
      await client.logout(token).catch(() => {});
      setToken(null);
      setConfirm(null);
      setResetDone(true);
      setTimeout(() => window.location.replace(startUrl()), 2200);
    } catch (e) {
      fail(e);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const current = wishes.find((w) => w.id === openId) ?? null;
  const unread = wishes.filter((w) => !w.read).length;
  const fade = { initial: { opacity: 0, y: reduced ? 0 : 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, transition: { duration: 0.25 } };

  return (
    <div className="vault" role="dialog" aria-modal="true" aria-labelledby="vault-title">
      <motion.div className="vault__panel" initial={{ opacity: 0, scale: reduced ? 1 : 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
        <header className="vault__head">
          <div>
            <p className="vault__eyebrow mono">Private</p>
            <h2 id="vault-title" className="vault__title mono">
              {t.title}
            </h2>
          </div>
          <button type="button" className="vault__icon" onClick={close} aria-label={t.closeLabel}>
            <X size={20} />
          </button>
        </header>

        {error && (
          <p className="vault__error" role="alert">
            {error}
          </p>
        )}

        {resetDone ? (
          <p className="vault__done serif" role="status">
            {t.resetDone}
          </p>
        ) : !token ? (
          <form className="vault__login" onSubmit={login}>
            <p className="vault__lead serif">{t.loginLead}</p>
            <label htmlFor="vault-code" className="vault__label">
              {t.codeLabel}
            </label>
            <input
              id="vault-code"
              ref={codeRef}
              className="vault__input"
              type="password"
              autoComplete="current-password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy}
            />
            <button type="submit" className="btn vault__gold" disabled={busy || !code}>
              <Lock size={16} aria-hidden="true" /> {t.openLabel}
            </button>
          </form>
        ) : (
          <div className="vault__body">
            <div className="vault__toolbar">
              <p className="vault__count mono" aria-live="polite">
                {wishes.length} {wishes.length === 1 ? 'wish' : 'wishes'} · {unread} {t.unread.toLowerCase()}
              </p>
              <div className="vault__tools">
                <button type="button" className="vault__icon" onClick={() => refresh()} aria-label={t.refreshLabel} disabled={busy}>
                  <RefreshCw size={18} />
                </button>
                <button type="button" className="btn btn--ghost btn--small" onClick={close}>
                  <Lock size={14} aria-hidden="true" /> {t.lockLabel}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {current ? (
                <motion.article key={current.id} className="vault__reader" {...fade}>
                  <button type="button" className="vault__back" onClick={() => setOpenId(null)}>
                    <ArrowLeft size={16} aria-hidden="true" /> {t.back}
                  </button>
                  <p className="vault__when mono">{formatWhen(current.createdAt)}</p>
                  <p className="vault__text serif">{current.text}</p>
                  <div className="vault__actions">
                    <button type="button" className="btn btn--ghost btn--small" onClick={() => toggleRead(current)}>
                      {current.read ? <Mail size={15} aria-hidden="true" /> : <MailOpen size={15} aria-hidden="true" />}{' '}
                      {current.read ? t.markUnread : t.markRead}
                    </button>
                    <button type="button" className="btn btn--small vault__danger" onClick={() => setConfirm({ kind: 'delete', id: current.id })}>
                      <Trash2 size={15} aria-hidden="true" /> {t.delete}
                    </button>
                  </div>
                </motion.article>
              ) : (
                <motion.div key="list" {...fade}>
                  <h3 className="vault__section mono">{t.inboxTitle}</h3>
                  {wishes.length === 0 ? (
                    <p className="vault__empty serif">{t.empty}</p>
                  ) : (
                    <ul className="vault__list" role="list">
                      {wishes.map((w) => (
                        <li key={w.id}>
                          <button type="button" className={`vault__item ${w.read ? '' : 'is-unread'}`} onClick={() => open(w)}>
                            <span className="vault__item-top">
                              <span className={`vault__badge mono ${w.read ? '' : 'is-unread'}`}>{w.read ? t.read : t.unread}</span>
                              <span className="vault__when mono">{formatWhen(w.createdAt)}</span>
                            </span>
                            <span className="vault__preview">{w.text}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <section className="vault__control" aria-labelledby="vault-control">
              <h3 id="vault-control" className="vault__section mono">
                {t.controlRoomTitle}
              </h3>
              <p className="vault__control-lead">{t.controlRoomLead}</p>
              <button type="button" className="btn vault__reset" onClick={() => setConfirm({ kind: 'reset' })} disabled={busy}>
                <RotateCcw size={16} aria-hidden="true" /> {t.resetLabel}
              </button>
            </section>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {confirm && (
          <motion.div className="vault__confirm-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="vault__confirm" role="alertdialog" aria-modal="true" aria-labelledby="vault-confirm-title" aria-describedby="vault-confirm-body">
              <h3 id="vault-confirm-title" className="serif">
                {confirm.kind === 'reset' ? t.resetConfirmTitle : t.deleteConfirmTitle}
              </h3>
              <p id="vault-confirm-body">{confirm.kind === 'reset' ? t.resetConfirmBody : t.deleteConfirmBody}</p>
              <div className="vault__actions">
                <button type="button" className="btn btn--ghost btn--small" onClick={() => setConfirm(null)} autoFocus>
                  {t.cancel}
                </button>
                <button
                  type="button"
                  className={`btn btn--small ${confirm.kind === 'reset' ? 'vault__gold' : 'vault__danger'}`}
                  disabled={busy}
                  onClick={() => (confirm.kind === 'reset' ? doReset() : doDelete(confirm.id))}
                >
                  {confirm.kind === 'reset' ? t.resetConfirm : t.deleteConfirm}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
