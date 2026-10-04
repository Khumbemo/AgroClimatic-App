import { useRef, useState } from 'react';
import { Moon, Sun, LogOut, Download, Upload, Copy, Database, Bot, Info } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { IS_DEMO } from '../../config';
import { useData } from '../../data/hooks';
import { exportBackup, restoreBackup, type RestoreReport } from '../../data/backup';
import { quarantineKey } from '../../data/migrateLegacy';
import { AI_ENABLED, AI_MODEL } from '../../services/ai';
import { Page, PageHeader, Section } from '../../components/ui/Page';
import { Notice } from '../../components/ui/Display';
import Button from '../../components/ui/Button';
import FormError from '../../components/data/FormError';

const readQuarantine = (scope: string): unknown[] => {
  try {
    const raw = localStorage.getItem(quarantineKey(scope));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

/** Copy text; returns false when the clipboard is unavailable. */
const copyText = async (text: string) => {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { repo } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restore, setRestore] = useState<RestoreReport | null>(null);
  const [busy, setBusy] = useState(false);
  const quarantined = readQuarantine(repo.backend.scope);

  const backupJson = async () => JSON.stringify(await exportBackup(repo), null, 2);

  const download = async () => {
    setError(null);
    try {
      const blob = new Blob([await backupJson()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agroclimatic-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Backup file created. If no download started, use “Copy backup” instead.');
    } catch (e) { setError(`Could not create the backup: ${(e as Error).message}`); }
  };

  const copy = async () => {
    setError(null);
    setMessage(null);
    if (await copyText(await backupJson())) setMessage('Backup copied to the clipboard. Paste it into a .json file to keep it.');
    else setError('The clipboard is not available here. Use “Download backup”.');
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError(null); setMessage(null); setRestore(null);
    try {
      const report = await restoreBackup(repo, JSON.parse(await file.text()));
      setRestore(report);
    } catch (e) {
      setError(e instanceof SyntaxError ? 'That file is not valid JSON.' : (e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Page>
      <PageHeader title="Settings" />

      <Section title="Account">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-md bg-green-700 text-white flex items-center justify-center text-lg font-semibold">{user?.displayName?.charAt(0) ?? user?.email?.charAt(0)?.toUpperCase() ?? '?'}</div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 truncate">{user?.displayName ?? 'Signed in'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email ?? ''}</p>
          </div>
          <Button variant="secondary" size="sm" icon={<LogOut className="w-3.5 h-3.5" />} onClick={() => logout()}>Sign out</Button>
        </div>
        {IS_DEMO && <p className="text-xs text-gray-500 mt-3">Demo mode: no Firebase project is configured, so you are signed in as a demo user.</p>}
      </Section>

      <Section title="Appearance">
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-2">
          {(['light', 'dark'] as const).map(t => (
            <button key={t} role="radio" aria-checked={theme === t} onClick={() => theme !== t && toggleTheme()}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-md border text-sm ${theme === t ? 'border-green-700 bg-green-50 text-green-900 font-medium' : 'border-gray-300 text-gray-700'}`}>
              {t === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {t === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Data">
        <p className="text-sm text-gray-700 flex gap-2"><Database className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
          {IS_DEMO ? 'Records are stored in this browser only. Clearing site data deletes them, so keep a backup.' : 'Records are stored in your Firebase account and kept on this device for offline use; changes sync when you are online.'}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={download}>Download backup</Button>
          <Button variant="secondary" size="sm" icon={<Copy className="w-3.5 h-3.5" />} onClick={copy}>Copy backup</Button>
          <Button variant="secondary" size="sm" icon={<Upload className="w-3.5 h-3.5" />} onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Restoring…' : 'Restore from file'}</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Backup file" onChange={e => onFile(e.target.files?.[0])} />
        </div>
        <p className="text-[11px] text-gray-500 mt-2">Restoring adds or updates records by their id; records not in the file are kept.</p>
        {message && <p className="text-xs text-green-800 mt-2" role="status">{message}</p>}
        {restore && (
          <p className="text-xs text-green-800 mt-2" role="status">
            Restored {restore.restored} record{restore.restored === 1 ? '' : 's'}.{restore.skipped.length > 0 && ` ${restore.skipped.length} skipped because of invalid values (first: ${restore.skipped[0].collection} ${restore.skipped[0].id}: ${restore.skipped[0].reason}).`}
          </p>
        )}
        {error && <div className="mt-2"><FormError message={error} /></div>}
        {quarantined.length > 0 && (
          <div className="mt-3">
            <Notice>
              {quarantined.length} record{quarantined.length === 1 ? '' : 's'} from the old version had values outside valid ranges and were not moved. They are still in this browser’s original data.
              <div className="mt-2"><Button size="sm" variant="secondary" icon={<Copy className="w-3.5 h-3.5" />} onClick={async () => setMessage((await copyText(JSON.stringify(quarantined, null, 2))) ? 'Records copied to the clipboard.' : 'The clipboard is not available here.')}>Copy these records</Button></div>
            </Notice>
          </div>
        )}
      </Section>

      <Section title="AgroBot">
        <p className="text-sm text-gray-700 flex gap-2"><Bot className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
          {AI_ENABLED ? <>Connected to Google Gemini (<span className="font-mono-sci">{AI_MODEL}</span>). Questions include a summary of your records.</> : 'Offline: answers come from your records and a small built-in reference. Add a Gemini API key (VITE_GEMINI_API_KEY) to enable open questions.'}
        </p>
      </Section>

      <Section title="About">
        <p className="text-sm text-gray-700 flex gap-2"><Info className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />AgroClimatic nursery research app · data model v2 · units: SI (°C, kPa, mS cm⁻¹, mm, cm, g).</p>
      </Section>
    </Page>
  );
};

export default SettingsPage;
