import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import { ArrowLeft, Printer } from 'lucide-react';
import { Brand, Button, Spinner } from '../components/UI.jsx';

marked.setOptions({ gfm: true, breaks: false });

export default function Rules() {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetch('/QUIZ_RULES.md')
      .then(r => { if (!r.ok) throw new Error('Rules file not found'); return r.text(); })
      .then(text => { if (alive) setHtml(marked.parse(text)); })
      .catch(e => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  return (
    <div className="rules-page">
      <header className="rules-top">
        <Brand />
        <div className="rules-actions">
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft size={15} /> Back to arena</Button></Link>
          <Button variant="ghost" size="sm" onClick={() => window.print()}><Printer size={15} /> Print</Button>
        </div>
      </header>
      <main className="rules-main">
        {error ? <div className="alert error">{error}</div> : !html ? <Spinner label="Loading rules…" /> : (
          <article className="rules-doc" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </main>
      <footer className="rules-foot">
        <span>MSSN Remo Area Council · MSS Week 2026</span>
        <span>Rules &amp; Regulations</span>
      </footer>
    </div>
  );
}
