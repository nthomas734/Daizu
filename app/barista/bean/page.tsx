'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { homeDate, pastRecipeLine, pastRecipes, type Bean } from '@/lib/beans';
import { useBeans } from '@/components/beans/useBeans';
import { Btn, Card, Note, P, SANS, TopBar, mono } from '@/components/beans/ui';

/**
 * A new bag into the hopper, or ?id= to fix a bag's details (most often:
 * typing the roast date). No "best by" label: the day count and the shots
 * say more than a rule of thumb.
 */
export default function BeanPage() {
  const router = useRouter();
  const { data } = useBeans();
  const [editId, setEditId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [roaster, setRoaster] = useState('');
  const [roastDate, setRoastDate] = useState('');
  const [grams, setGrams] = useState('340');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) setEditId(Number(id));
  }, []);

  // Fill the form: the bag being edited, or the last bag's roaster for a new one
  useEffect(() => {
    if (!data || loaded) return;
    const editing = editId ? data.bags.find((b) => b.id === editId) : null;
    if (editing) {
      setName(editing.name);
      setRoaster(editing.roaster ?? '');
      setRoastDate(editing.roast_date ?? '');
      setGrams(String(editing.bag_grams));
      setNote(editing.note ?? '');
    } else {
      setRoaster(data.bags[0]?.roaster ?? 'RoosRoast');
    }
    setLoaded(true);
  }, [data, editId, loaded]);

  const past = useMemo(
    () => (data ? pastRecipes(name, data.bags, data.keyShots, editId ?? undefined) : []),
    [data, name, editId]
  );
  const names = useMemo(() => Array.from(new Set((data?.bags ?? []).map((b: Bean) => b.name))), [data]);

  const save = async () => {
    if (!name.trim()) { setErr('Give the bean a name.'); return; }
    setSaving(true);
    setErr('');
    const res = await fetch('/api/beans', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, name, roaster, roast_date: roastDate || null, bag_grams: Number(grams) || 340, note }),
    }).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) { setErr('Couldn’t save. Check the connection and try again.'); return; }
    router.push('/barista?tab=beans');
  };

  const field = (label: string, input: React.ReactNode) => (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', minHeight: '52px', borderBottom: `1px solid ${P.bg}12` }}>
      <span style={{ fontSize: '13px', flexShrink: 0 }}>{label}</span>
      {input}
    </label>
  );
  const inputStyle: React.CSSProperties = {
    flex: 1, minWidth: 0, textAlign: 'right', border: 'none', outline: 'none', background: 'transparent',
    fontFamily: SANS, fontSize: '16px', fontWeight: 600, color: P.bg, padding: '10px 0',
  };

  return (
    <div style={{ minHeight: '100vh', background: P.cream, color: P.bg, fontFamily: SANS }}>
      <TopBar back="beans" onBack={() => router.push('/barista?tab=beans')} title={editId ? 'this bag' : 'new bag'} />
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px', paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Card style={{ paddingTop: '4px', paddingBottom: '4px' }}>
          {field('bean', <input id="bean-name" list="bean-names" value={name} onChange={(e) => setName(e.target.value)} placeholder="lobster butter" style={inputStyle} />)}
          <datalist id="bean-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
          {field('roaster', <input id="bean-roaster" value={roaster} onChange={(e) => setRoaster(e.target.value)} placeholder="RoosRoast" style={inputStyle} />)}
          {field('roasted on', <input id="bean-roast-date" type="date" value={roastDate} max={homeDate()} onChange={(e) => setRoastDate(e.target.value)} style={inputStyle} />)}
          {field('bag, grams', <input id="bean-grams" inputMode="numeric" value={grams} onChange={(e) => setGrams(e.target.value.replace(/[^0-9]/g, ''))} style={inputStyle} />)}
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', minHeight: '52px' }}>
            <span style={{ fontSize: '13px', flexShrink: 0 }}>note</span>
            <input id="bean-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" style={{ ...inputStyle, fontWeight: 400 }} />
          </label>
        </Card>

        {!editId && past.length > 0 && (
          <Note tone="note">
            <b style={{ display: 'block', color: P.bg, marginBottom: '2px' }}>You&apos;ve had this one before.</b>
            {past.slice(0, 3).map(pastRecipeLine).join('. ')}. The first shot will start at the last one.
          </Note>
        )}

        {!editId && data?.hopper && (
          <p style={{ margin: 0, fontSize: '13px', color: `${P.bg}99` }}>Putting it in the hopper finishes {data.hopper.name.toLowerCase()}.</p>
        )}
        {err && <p style={{ margin: 0, fontSize: '13px', color: P.accent }}>{err}</p>}
        <Btn disabled={saving} onClick={save}>{saving ? 'saving…' : editId ? 'save' : 'into the hopper'}</Btn>
        {!editId && <p style={mono({ textAlign: 'center', opacity: 0.5, marginTop: '4px' })}>no roast date? leave it, add it later</p>}
      </div>
    </div>
  );
}
