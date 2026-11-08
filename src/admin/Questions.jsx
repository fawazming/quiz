import React, { useEffect, useMemo, useState } from 'react';
import { Search, Database, BookOpen, Eye } from 'lucide-react';
import { Card, Badge, Modal, Spinner, Empty } from '../components/UI.jsx';
import { api } from '../api.js';
import { useToast } from '../toast.jsx';

export default function Questions() {
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState('all');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(null);

  useEffect(() => {
    api('/api/admin/questions')
      .then(setRows)
      .catch(e => push(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => rows.filter(q =>
    (pool === 'all' || q.pool === pool) &&
    `${q.prompt} ${q.topic} ${q.source} ${q.pdfRef}`.toLowerCase().includes(search.toLowerCase())
  ), [rows, pool, search]);

  const counts = useMemo(() => ({
    round1: rows.filter(q => q.pool === 'round1').length,
    round2: rows.filter(q => q.pool === 'round2').length,
    round3: rows.filter(q => q.pool === 'round3').length
  }), [rows]);

  return (
    <div className="stack">
      <Card title="PDF-sourced question bank" subtitle="Every question is taken from, or derived strictly from, the MSSN Remo ICT Quiz 2026 study guide.">
        <div className="bank-summary">
          <div><Database size={18} /><strong>{rows.length}</strong><span>total questions</span></div>
          <div><span className="dot green" /><strong>{counts.round1}</strong><span>Round 1 CBT</span></div>
          <div><span className="dot gold" /><strong>{counts.round2}</strong><span>Round 2 pick</span></div>
          <div><span className="dot red" /><strong>{counts.round3}</strong><span>Round 3 race</span></div>
        </div>
        <div className="toolbar">
          <div className="search-box"><Search size={16} /><input placeholder="Search prompt, topic or source…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="segmented">
            {['all','round1','round2','round3'].map(p => (
              <button key={p} className={pool === p ? 'active' : ''} onClick={() => setPool(p)}>{p === 'all' ? 'All' : p.replace('round','R')}</button>
            ))}
          </div>
        </div>
        {loading ? <Spinner label="Loading question bank…" /> : filtered.length ? (
          <div className="table-wrap">
            <table className="data-table question-table">
              <thead><tr><th>Question</th><th>Source</th><th>Pool</th><th>Answer</th><th></th></tr></thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id}>
                    <td><strong className="clamp-2">{q.prompt}</strong><small>{q.topic} · {q.pdfRef}</small></td>
                    <td>{q.source}</td>
                    <td><Badge tone={q.pool === 'round1' ? 'green' : q.pool === 'round2' ? 'gold' : 'red'}>{q.pool}</Badge></td>
                    <td><strong>{'ABCD'[q.correctIndex]}</strong> · {q.options[q.correctIndex].slice(0, 48)}{q.options[q.correctIndex].length > 48 ? '…' : ''}</td>
                    <td><button className="icon-btn" onClick={() => setActive(q)} title="View question"><Eye size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty title="No matching questions">Change the filter or search term.</Empty>}
      </Card>

      <Modal open={!!active} onClose={() => setActive(null)} title={active?.source || 'Question'} wide>
        {active && (
          <div className="question-detail">
            <div className="q-meta"><Badge tone="gold">{active.pool}</Badge><Badge tone="blue">Module {active.module}</Badge><span>{active.pdfRef}</span></div>
            <h3 className="q-prompt">{active.prompt}</h3>
            <div className="detail-options">
              {active.options.map((o, i) => (
                <div key={i} className={`detail-option ${i === active.correctIndex ? 'correct' : ''}`}>
                  <b>{'ABCD'[i]}</b><span>{o}</span>
                </div>
              ))}
            </div>
            <div className="answer-note"><strong>Answer:</strong> {active.options[active.correctIndex]}<br /><span>{active.explanation}</span></div>
            <p className="muted small"><BookOpen size={13} /> Source: {active.source} · {active.pdfRef}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
