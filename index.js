const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const jsonParser = bodyParser.json();

// Middleware para registrar todas las peticiones
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Habilitar CORS para todas las rutas
app.use(cors());

// Abre (o crea) la base de datos SQLite
let db = new sqlite3.Database('./base.sqlite3', (err) => {
  if (err) console.error(err.message);
  else console.log('Conectado a la base de datos SQLite.');

  db.run(`CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    todo TEXT NOT NULL,
    created_at INTEGER
  )`);
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ status: 'ok2' });
});

// Endpoint GET /todos para listar todas las tareas con fecha legible
app.get('/todos', (req, res) => {
  db.all('SELECT * FROM todos', [], (err, rows) => {
    if (err) {
      console.error('Error al obtener tareas:', err.message);
      return res.status(500).json({ error: 'Error al obtener tareas.' });
    }
    // Normalizar created_at: si es entero (UNIX), convertir a ISO 8601
    const formatted = rows.map(r => {
      let date;
      if (typeof r.created_at === 'number') {
        date = new Date(r.created_at * 1000);
      } else if (!isNaN(Number(r.created_at))) {
        // a veces SQLite devuelve string numérica
        date = new Date(Number(r.created_at) * 1000);
      } else {
        // si es texto legible
        date = new Date(r.created_at);
      }
      return { ...r, created_at: date.toISOString() };
    });
    res.json(formatted);
  });
});

// Endpoint POST /agrega_todo
app.post('/agrega_todo', jsonParser, (req, res) => {
  console.log('POST /agrega_todo -> body:', req.body);
  const { todo } = req.body;

  if (!todo || !todo.trim()) {
    return res.status(400).json({ error: 'El campo "todo" es obligatorio.' });
  }

  const createdAt = Math.floor(Date.now() / 1000);
  const stmt = db.prepare('INSERT INTO todos (todo, created_at) VALUES (?, ?)');
  stmt.run(todo, createdAt, function (err) {
    if (err) {
      console.error('Error al insertar:', err.message);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
    res.status(201).json({
      message: 'Tarea agregada con éxito.',
      id: this.lastID,
      todo,
      created_at: new Date(createdAt * 1000).toISOString()
    });
  });
  stmt.finalize();
});

// Catch-all para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// Iniciar servidor en todas las interfaces
const port = process.env.PORT || 3000;
const host = '0.0.0.0';
app.listen(port, host, () => {
  console.log(`Aplicación corriendo en http://${host}:${port}`);
});
