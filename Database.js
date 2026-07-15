import mysql from 'mysql2'
import dotenv from 'dotenv'
import express from 'express'
import path from 'path'                  
import { fileURLToPath } from 'url'

dotenv.config()

const app = express()
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json())

// Serves static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Interface Routing Paths
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Index2.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Index3.html'));
});

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
}).promise();

// --- SQL HELPER FUNCTIONS ---

async function createUser(username, email, password_hash) {
    const [result] = await pool.execute(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', 
        [username, email, password_hash]
    );
    return result.insertId;
}

async function getUserByUsername(username) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
}

/* NEW: Helper function to insert newly published literature */
async function createLiterature(title, writer_id, genre, summary, pdf_url) {
    const publication_date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const [result] = await pool.execute(
        'INSERT INTO literature (title, writer_id, Genre, publication_date, Summary, pdf_url) VALUES (?, ?, ?, ?, ?, ?)',
        [title, writer_id, genre, publication_date, summary, pdf_url]
    );
    return result.insertId;
}


// --- API ROUTING ENDPOINTS ---

app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const password_hash = "hashed_" + password; 

        const userId = await createUser(username, email, password_hash);
        res.status(201).json({ message: "User registered successfully!", userId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Could not register user." });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await getUserByUsername(username);

        if (!user || user.password_hash !== ("hashed_" + password)) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        res.json({ 
            message: "Login successful", 
            user: { id: user.id, username: user.username, role: user.role } 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Login failed" });
    }
});

/* NEW: API Endpoint to handle book publishing */
app.post('/api/publish', async (req, res) => {
    try {
        const { title, genre, summary } = req.body;

        const writer_id = 1; 
        const placeholder_pdf = "uploads/default.pdf"; 

        const litId = await createLiterature(title, writer_id, genre, summary, placeholder_pdf);
        
        res.status(201).json({ 
            message: "Literature added to the shelf successfully!", 
            literatureId: litId 
        });
    } catch (error) {
        console.error("Database Insert Error: ", error);
        res.status(500).json({ error: "Could not publish literature to the database." });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server listening at http://localhost:${PORT}`);
});