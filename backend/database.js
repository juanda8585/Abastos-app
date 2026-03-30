const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../database/abastos.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  -- ── Tablas base (para uso futuro / auth) ──────────────────────
  CREATE TABLE IF NOT EXISTS productos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT NOT NULL,
    precio_hoy  REAL NOT NULL DEFAULT 0,
    stock_kg    REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre   TEXT NOT NULL,
    email    TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    rol      TEXT NOT NULL CHECK(rol IN ('admin', 'vendedor'))
  );

  CREATE TABLE IF NOT EXISTS fiados (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_nombre TEXT NOT NULL,
    producto_id    INTEGER NOT NULL,
    kilos          REAL NOT NULL,
    total          REAL NOT NULL,
    pagado         INTEGER DEFAULT 0,
    fecha          TEXT NOT NULL,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
  );

  -- ── Tablas del sistema de inventario de pulpas ─────────────────
  CREATE TABLE IF NOT EXISTS entradas (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha     TEXT NOT NULL,
    sabor     TEXT NOT NULL,
    kilos     REAL NOT NULL,
    costo     REAL NOT NULL,
    proveedor TEXT DEFAULT '',
    obs       TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS produccion (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    lote       TEXT NOT NULL,
    sabor      TEXT NOT NULL,
    bolsas     INTEGER NOT NULL,
    kilos      REAL DEFAULT 0,
    fecha_elab TEXT NOT NULL,
    fecha_venc TEXT DEFAULT '',
    empleada   TEXT DEFAULT '',
    obs        TEXT DEFAULT '',
    vendidas   INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS ventas_pulpa (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha    TEXT NOT NULL,
    sabor    TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    precio   REAL NOT NULL,
    total    REAL NOT NULL,
    cliente  TEXT DEFAULT '',
    canal    TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS gastos_app (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha       TEXT NOT NULL,
    categoria   TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    valor       REAL NOT NULL
  );
`);

console.log('✅ Base de datos lista');
module.exports = db;
