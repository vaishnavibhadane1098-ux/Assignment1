// simulate.js
import express from 'express';
import pkg from 'pg';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const { Pool } = pkg;
const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json()); // Parses JSON request bodies

// PostgreSQL Pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: +process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// --------- BEDROOM CRUD Routes ---------

// GET all bedrooms
app.get('/api/bedrooms', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bedrooms ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bedrooms:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET bedroom by ID
app.get('/api/bedrooms/:id', async (req, res) => {
    console.log("getttttttttt",req.params)
  const id = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM bedrooms WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bedroom not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching bedroom by ID:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST create bedroom
app.post('/api/bedrooms', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Bedroom name is required' });

  try {
    const result = await pool.query(
      'INSERT INTO bedrooms (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error inserting bedroom:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT update bedroom
app.put('/api/bedrooms/:id', async (req, res) => {
  const id = req.params.id;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Bedroom name is required' });

  try {
    const result = await pool.query(
      'UPDATE bedrooms SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bedroom not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating bedroom:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE bedroom
app.delete('/api/bedrooms/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('DELETE FROM bedrooms WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bedroom not found' });
    }
    res.json({ message: 'Bedroom deleted' });
  } catch (error) {
    console.error('Error deleting bedroom:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --------- SENSOR DATA SIMULATION ---------
// Get environment data for a bedroom
app.get('/api/bedrooms/:bedroomId/environment', async (req, res) => {
  const { bedroomId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM apartment_environment WHERE bedroom_id = $1 ORDER BY timestamp DESC',
      [bedroomId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching environment data:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Insert simulated environment data
app.post('/api/bedrooms/:bedroomId/environment', async (req, res) => {
  const { bedroomId } = req.params;
  const { temperature, humidity } = req.body;
      const result = await pool.query('SELECT * FROM bedrooms WHERE id = $1', [bedroomId]);

  let roomName=result.rows[0].name
  

  if (temperature == null || humidity == null) {
    return res.status(400).json({ error: 'Temperature and humidity are required.' });
  }

  try { 
    console.log("bedroommmmm",bedroomId)
    const result = await pool.query(
  `INSERT INTO apartment_environment (bedroom_id, room_name, temperature, humidity)
   SELECT id, name, $1, $2 FROM bedrooms WHERE name = $3
   RETURNING *`,
  [temperature, humidity, roomName]   // note: now using roomName instead of bedroomId
);
    // const result = await pool.query(
    //   `INSERT INTO apartment_environment (bedroom_id, room_name, temperature, humidity)
    //    SELECT id, name, $1, $2 FROM bedrooms WHERE id = $3
    //    RETURNING *`,
    //   [temperature, humidity, bedroomId]
    // );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.log("errrrrrrrrrrrr",error)
    console.error('Error inserting environment data:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a specific environment record
app.delete('/api/bedrooms/environment/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM apartment_environment WHERE id = $1 RETURNING *', [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json({ message: 'Record deleted', record: result.rows[0] });
  } catch (error) {
    console.error('Error deleting environment data:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Update environment data for a bedroom
app.put('/api/bedrooms/:bedroomId/environment/:recordId', async (req, res) => {
  const { bedroomId, recordId } = req.params;
  const { temperature, humidity } = req.body;

  if (temperature == null || humidity == null) {
    return res.status(400).json({ error: 'Temperature and humidity are required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE apartment_environment
       SET temperature = $1, humidity = $2
       WHERE id = $3 AND bedroom_id = $4
       RETURNING *`,
      [temperature, humidity, recordId, bedroomId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Record not found for this bedroom.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating environment data:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


function generateSensorData() {
  const temperature = +(Math.random() * (35 - 22.5) + 22.5).toFixed(2);
  const humidity = +(Math.random() * (70 - 30) + 30).toFixed(2);
  return { temperature, humidity };
}

async function insertSensorData(roomName) {
  const { temperature, humidity } = generateSensorData();
  const timestamp = new Date();

  try {
    await pool.query(
      `INSERT INTO apartment_environment (room_name, timestamp, temperature, humidity)
       VALUES ($1, $2, $3, $4)`,
      [roomName, timestamp, temperature, humidity]
    );
    console.log(`Inserted: ${roomName} - Temp: ${temperature}, Humidity: ${humidity}`);
  } catch (error) {
    console.error('Error inserting sensor data:', error.message);
  }
}

// function startSimulation() {
//   setInterval(async () => {
//     await insertSensorData('Bedroom 1');
//     await insertSensorData('Bedroom 2');
//   }, 60 * 1000);
//   console.log('Simulation running: 1 min interval...');
// }
async function getDistinctRoomNames() {
  try {
    const result = await pool.query('SELECT DISTINCT room_name FROM apartment_environment');
    return result.rows.map(row => row.room_name);
  } catch (error) {
    console.error('Error fetching distinct room names:', error.message);
    return [];
  }
}

async function startSimulation() {
  const roomNames = await getDistinctRoomNames();

  if (roomNames.length === 0) {
    console.log('No room names found. Simulation will not start.');
    return;
  }

  setInterval(async () => {
    for (const roomName of roomNames) {
      await insertSensorData(roomName);
    }
  }, 60 * 1000);

  console.log('Simulation running with rooms:', roomNames, 'at 1 min interval...');
}

// Root health check
app.get('/', (req, res) => {
  res.send('Smart Apartment backend is running.');
});

// --------- START SERVER ---------
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
  startSimulation();
});
