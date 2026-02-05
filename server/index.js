import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Agentic Workflow API',
    docs: 'Use the app at http://localhost:5173 — this server is for API only.',
    endpoints: ['GET /api/workflows', 'PUT /api/workflows', 'POST /api/workflows', 'GET /api/executions', 'POST /api/executions', 'GET /api/status']
  });
});

// Quick check: counts from DB (proves server is storing)
app.get('/api/status', (req, res) => {
  try {
    const workflows = db.prepare('SELECT COUNT(*) as c FROM workflows').get();
    const executions = db.prepare('SELECT COUNT(*) as c FROM executions').get();
    res.json({
      stored: true,
      workflows: workflows?.c ?? 0,
      executions: executions?.c ?? 0
    });
  } catch (err) {
    res.status(500).json({ stored: false, error: err.message });
  }
});

// ——— Settings ———
app.get('/api/settings', (req, res) => {
  try {
    const row = db.prepare('SELECT total_budget as totalBudget, retry_budget as retryBudget, model_costs as modelCosts, notification_email as notificationEmail FROM settings WHERE id = 1').get();
    if (!row) return res.json({ totalBudget: 0, retryBudget: 3, modelCosts: {}, notificationEmail: '' });
    res.json({
      totalBudget: row.totalBudget ?? 0,
      retryBudget: row.retryBudget ?? 3,
      modelCosts: typeof row.modelCosts === 'string' ? (JSON.parse(row.modelCosts || '{}')) : (row.modelCosts || {}),
      notificationEmail: row.notificationEmail || ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const { totalBudget, retryBudget, modelCosts, notificationEmail } = req.body;
    db.prepare(
      'UPDATE settings SET total_budget = ?, retry_budget = ?, model_costs = ?, notification_email = ? WHERE id = 1'
    ).run(
      Number(totalBudget) || 0,
      Number(retryBudget) ?? 3,
      JSON.stringify(modelCosts || {}),
      String(notificationEmail || '').trim()
    );
    res.json({
      totalBudget: Number(totalBudget) || 0,
      retryBudget: Number(retryBudget) ?? 3,
      modelCosts: modelCosts || {},
      notificationEmail: String(notificationEmail || '').trim()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ——— Workflows ———
app.get('/api/workflows', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, created_at as createdAt, steps FROM workflows ORDER BY created_at ASC').all();
    const workflows = rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      steps: JSON.parse(r.steps || '[]'),
    }));
    res.json(workflows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workflows', (req, res) => {
  try {
    const { id, name, createdAt, steps } = req.body;
    db.prepare(
      'INSERT INTO workflows (id, name, created_at, steps) VALUES (?, ?, ?, ?)'
    ).run(id, name, createdAt, JSON.stringify(steps || []));
    res.status(201).json({ id, name, createdAt, steps: steps || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/workflows/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, createdAt, steps } = req.body;
    db.prepare(
      'UPDATE workflows SET name = ?, created_at = ?, steps = ? WHERE id = ?'
    ).run(name, createdAt, JSON.stringify(steps || []), id);
    res.json({ id, name, createdAt, steps: steps || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/workflows/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM workflows WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Replace all workflows (sync full list from client)
app.put('/api/workflows', (req, res) => {
  try {
    const workflows = req.body?.workflows ?? req.body;
    if (!Array.isArray(workflows)) {
      return res.status(400).json({ error: 'Expected workflows array' });
    }
    const run = db.transaction(() => {
      db.prepare('DELETE FROM workflows').run();
      const stmt = db.prepare('INSERT INTO workflows (id, name, created_at, steps) VALUES (?, ?, ?, ?)');
      for (const w of workflows) {
        stmt.run(w.id, w.name, w.createdAt, JSON.stringify(w.steps || []));
      }
    });
    run();
    res.json(workflows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Import workflows (merge: add imported workflows to existing)
app.post('/api/workflows/import', (req, res) => {
  try {
    const body = req.body;
    const toImport = Array.isArray(body) ? body : (body?.workflows || []);
    if (toImport.length === 0) return res.status(400).json({ error: 'No workflows in body' });
    const existing = db.prepare('SELECT id, name, created_at as createdAt, steps FROM workflows').all();
    const existingIds = new Set(existing.map((r) => r.id));
    const stmt = db.prepare('INSERT INTO workflows (id, name, created_at, steps) VALUES (?, ?, ?, ?)');
    const imported = [];
    for (const w of toImport) {
      const id = w.id || `import-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const name = w.name || 'Imported';
      const createdAt = w.createdAt || Date.now();
      const steps = Array.isArray(w.steps) ? w.steps : [];
      if (existingIds.has(id)) continue;
      existingIds.add(id);
      stmt.run(id, name, createdAt, JSON.stringify(steps));
      imported.push({ id, name, createdAt, steps });
    }
    res.status(201).json({ imported: imported.length, workflows: existing.length + imported.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ——— Executions ———
app.get('/api/executions', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const rows = db.prepare(
      'SELECT id, workflow_id as workflowId, status, results, started_at as startedAt, completed_at as completedAt, total_cost as totalCost FROM executions ORDER BY created_at DESC LIMIT ?'
    ).all(limit);
    const executions = rows.map((r) => ({
      id: r.id,
      workflowId: r.workflowId,
      status: r.status,
      results: JSON.parse(r.results || '[]'),
      startedAt: r.startedAt,
      completedAt: r.completedAt ?? undefined,
      totalCost: r.totalCost ?? undefined,
    }));
    res.json(executions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

async function sendCompletionEmail(toEmail, workflowName, status, executionId) {
  if (!toEmail || !toEmail.includes('@')) {
    console.log('[Email] Skipping: No valid email address');
    return;
  }
  const transportOpts = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  };
  if (!transportOpts.host && !transportOpts.auth?.user) {
    console.log('[Email] Skipping: SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS, FROM_EMAIL env vars)');
    return;
  }
  try {
    console.log(`[Email] Sending to ${toEmail}...`);
    const transporter = nodemailer.createTransport(transportOpts);
    const subject = status === 'completed' ? `Workflow completed: ${workflowName}` : `Workflow failed: ${workflowName}`;
    const text = `Workflow "${workflowName}" ${status === 'completed' ? 'completed successfully' : 'failed'}.\nExecution ID: ${executionId}`;
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@localhost',
      to: toEmail,
      subject,
      text
    });
    console.log(`[Email] Sent successfully: ${info.messageId}`);
  } catch (e) {
    console.error('[Email] Send failed:', e.message);
    console.error('[Email] Error details:', e);
  }
}

app.post('/api/executions', async (req, res) => {
  try {
    const { id, workflowId, status, results, startedAt, completedAt, workflowName, totalCost } = req.body;
    const totalCostNum = totalCost != null ? Number(totalCost) : null;
    db.prepare(
      `INSERT INTO executions (id, workflow_id, status, results, started_at, completed_at, total_cost) 
       VALUES (?, ?, ?, ?, ?, ?, ?) 
       ON CONFLICT(id) DO UPDATE SET 
         workflow_id = excluded.workflow_id,
         status = excluded.status,
         results = excluded.results,
         started_at = excluded.started_at,
         completed_at = excluded.completed_at,
         total_cost = excluded.total_cost`
    ).run(
      id,
      workflowId,
      status,
      JSON.stringify(results || []),
      startedAt,
      completedAt ?? null,
      totalCostNum
    );
    if ((status === 'completed' || status === 'failed') && workflowName) {
      const row = db.prepare('SELECT notification_email FROM settings WHERE id = 1').get();
      const email = row?.notification_email;
      if (email) await sendCompletionEmail(email, workflowName, status, id);
    }
    res.status(201).json({
      id,
      workflowId,
      status,
      results: results || [],
      startedAt,
      completedAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
