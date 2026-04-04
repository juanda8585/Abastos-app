const express = require('express');
const cors    = require('cors');
const db      = require('./database');

const app  = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ── HEALTH ────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: '✅ Bubalá API corriendo', port: PORT }));

// ══════════════════════════════════════════════════════════════════
//  ENTRADAS DE FRUTA
// ══════════════════════════════════════════════════════════════════
app.get('/api/entradas', (req, res) => {
  try {
    const { desde, hasta, limit = 50 } = req.query;
    const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 10000);
    const where = []; const params = [];
    if (desde) { where.push('fecha >= ?'); params.push(desde); }
    if (hasta) { where.push('fecha <= ?'); params.push(hasta); }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const rows = db.prepare(`SELECT * FROM entradas ${w} ORDER BY fecha DESC, id DESC LIMIT ?`).all(...params, lim);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/entradas', (req, res) => {
  try {
    const { fecha, sabor, kilos, costo, proveedor, obs } = req.body;
    if (!fecha || !sabor || !kilos || !costo)
      return res.status(400).json({ error: 'Faltan campos: fecha, sabor, kilos, costo' });
    const info = db.prepare(
      'INSERT INTO entradas (fecha, sabor, kilos, costo, proveedor, obs) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(fecha, sabor, Number(kilos), Number(costo), proveedor || '', obs || '');
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/entradas/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM entradas WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  PRODUCCIÓN
// ══════════════════════════════════════════════════════════════════
app.get('/api/produccion', (req, res) => {
  try {
    const { desde, hasta, limit = 50 } = req.query;
    const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 10000);
    const where = []; const params = [];
    if (desde) { where.push('fecha_elab >= ?'); params.push(desde); }
    if (hasta) { where.push('fecha_elab <= ?'); params.push(hasta); }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    // Alias fecha_elab / fecha_venc to camelCase so the frontend works as-is
    const rows = db.prepare(`
      SELECT id, lote, sabor, bolsas, kilos,
             fecha_elab AS fechaElab, fecha_venc AS fechaVenc,
             empleada, obs, vendidas
      FROM produccion ${w} ORDER BY fecha_elab DESC, id DESC LIMIT ?
    `).all(...params, lim);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/produccion', (req, res) => {
  try {
    const { lote, sabor, bolsas, kilos, fechaElab, fechaVenc, empleada, obs } = req.body;
    if (!lote || !sabor || !bolsas || !fechaElab)
      return res.status(400).json({ error: 'Faltan campos: lote, sabor, bolsas, fechaElab' });
    const info = db.prepare(`
      INSERT INTO produccion (lote, sabor, bolsas, kilos, fecha_elab, fecha_venc, empleada, obs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(lote, sabor, Number(bolsas), Number(kilos || 0), fechaElab, fechaVenc || '', empleada || '', obs || '');
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/produccion/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM produccion WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  VENTAS
// ══════════════════════════════════════════════════════════════════
app.get('/api/ventas', (req, res) => {
  try {
    const { desde, hasta, limit = 50 } = req.query;
    const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 10000);
    const where = []; const params = [];
    if (desde) { where.push('fecha >= ?'); params.push(desde); }
    if (hasta) { where.push('fecha <= ?'); params.push(hasta); }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const rows = db.prepare(`SELECT * FROM ventas_pulpa ${w} ORDER BY fecha DESC, id DESC LIMIT ?`).all(...params, lim);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ventas', (req, res) => {
  try {
    const { fecha, sabor, cantidad, precio, total, cliente, canal } = req.body;
    if (!fecha || !sabor || !cantidad || !precio)
      return res.status(400).json({ error: 'Faltan campos: fecha, sabor, cantidad, precio' });
    const info = db.prepare(
      'INSERT INTO ventas_pulpa (fecha, sabor, cantidad, precio, total, cliente, canal) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(fecha, sabor, Number(cantidad), Number(precio), Number(total), cliente || '', canal || '');
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/ventas/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM ventas_pulpa WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  GASTOS
// ══════════════════════════════════════════════════════════════════
app.get('/api/gastos', (req, res) => {
  try {
    const { desde, hasta, limit = 50 } = req.query;
    const lim = Math.min(Math.max(parseInt(limit) || 50, 1), 10000);
    const where = []; const params = [];
    if (desde) { where.push('fecha >= ?'); params.push(desde); }
    if (hasta) { where.push('fecha <= ?'); params.push(hasta); }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const rows = db.prepare(`SELECT * FROM gastos_app ${w} ORDER BY fecha DESC, id DESC LIMIT ?`).all(...params, lim);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/gastos', (req, res) => {
  try {
    const { fecha, categoria, descripcion, valor } = req.body;
    if (!fecha || !categoria || !valor)
      return res.status(400).json({ error: 'Faltan campos: fecha, categoria, valor' });
    const info = db.prepare(
      'INSERT INTO gastos_app (fecha, categoria, descripcion, valor) VALUES (?, ?, ?, ?)'
    ).run(fecha, categoria, descripcion || '', Number(valor));
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/gastos/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM gastos_app WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  DASHBOARD STATS
// ══════════════════════════════════════════════════════════════════
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const mes = new Date().toISOString().slice(0, 7);
    const ventasMes  = db.prepare("SELECT COALESCE(SUM(total),0) AS t FROM ventas_pulpa WHERE fecha LIKE ?").get(mes + '%').t;
    const gastosMes  = db.prepare("SELECT COALESCE(SUM(valor),0) AS t FROM gastos_app WHERE fecha LIKE ?").get(mes + '%').t;
    const totalProd  = db.prepare("SELECT COALESCE(SUM(bolsas),0) AS t FROM produccion").get().t;
    const totalVend  = db.prepare("SELECT COALESCE(SUM(cantidad),0) AS t FROM ventas_pulpa").get().t;
    res.json({
      ventasMes,
      gastosMes,
      gananciaMes: ventasMes - gastosMes,
      bolsasStock: Math.max(0, totalProd - totalVend),
      totalProducidas: totalProd,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  PRODUCTOS (referencia / futura integración)
// ══════════════════════════════════════════════════════════════════
app.get('/api/productos', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM productos ORDER BY nombre ASC').all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/productos', (req, res) => {
  try {
    const { nombre, precio_hoy, stock_kg } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre requerido' });
    const info = db.prepare('INSERT INTO productos (nombre, precio_hoy, stock_kg) VALUES (?, ?, ?)')
      .run(nombre, Number(precio_hoy || 0), Number(stock_kg || 0));
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  USUARIOS
// ══════════════════════════════════════════════════════════════════
app.get('/api/usuarios', (req, res) => {
  try {
    res.json(db.prepare('SELECT id, nombre, email, rol FROM usuarios').all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/usuarios', (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password || !rol)
      return res.status(400).json({ error: 'Faltan campos: nombre, email, password, rol' });
    const info = db.prepare('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)')
      .run(nombre, email, password, rol);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
//  FIADOS
// ══════════════════════════════════════════════════════════════════
app.get('/api/fiados', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM fiados ORDER BY fecha DESC').all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/fiados', (req, res) => {
  try {
    const { cliente_nombre, producto_id, kilos, total, fecha } = req.body;
    if (!cliente_nombre || !producto_id || !kilos || !total || !fecha)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    const info = db.prepare(
      'INSERT INTO fiados (cliente_nombre, producto_id, kilos, total, fecha) VALUES (?, ?, ?, ?, ?)'
    ).run(cliente_nombre, Number(producto_id), Number(kilos), Number(total), fecha);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/fiados/:id/pagar', (req, res) => {
  try {
    db.prepare('UPDATE fiados SET pagado = 1 WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════
app.listen(PORT, () => console.log(`\n✅ Bubalá S.A.S — API corriendo en http://localhost:${PORT}\n`));
