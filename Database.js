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

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index2.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index3.html'));
});

app.get('/browse', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index6.html'));
});

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
}).promise();


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

async function createLiterature(title, writer_id, genre, summary, pdf_url) {
    const [result] = await pool.execute(
        'INSERT INTO literature (title, writer_id, Genre, Summary, pdf_url) VALUES (?, ?, ?, ?, ?)',
        [title, writer_id, genre, summary, pdf_url]
    );
    return result.insertId;
}


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

app.get('/api/literature', async (req, res) => {
    try {
       
        const query = `
            SELECT 
                l.id, 
                l.title, 
                l.Summary AS summary, 
                l.Genre AS genre,
                l.pdf_url, 
                u.username AS author,
                COUNT(CASE WHEN v.vote_type = 'like' THEN 1 END) AS likes,
                COUNT(CASE WHEN v.vote_type = 'dislike' THEN 1 END) AS dislikes
            FROM literature l
            JOIN users u ON l.writer_id = u.id
            LEFT JOIN votes v ON l.id = v.literature_id
            GROUP BY l.id, l.title, l.Summary, l.Genre, l.pdf_url, u.username
            ORDER BY l.created_at DESC
        `;
        const [rows] = await pool.execute(query);
        res.json(rows);
    } catch (error) {
        console.error("Database Fetch Error: ", error);
        res.status(500).json({ error: "Could not fetch literature feed." });
    }
});

app.post('/api/vote', async (req, res) => {
    try {
        const { user_id, literature_id, vote_type } = req.body;

        if (!user_id || !literature_id || !['like', 'dislike'].includes(vote_type)) {
            return res.status(400).json({ error: "Invalid parameters" });
        }

        const voteQuery = `
            INSERT INTO votes (users_id, literature_id, vote_type) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE vote_type = VALUES(vote_type)
        `;
        await pool.execute(voteQuery, [user_id, literature_id, vote_type]);

        const countQuery = `
            SELECT 
                COUNT(CASE WHEN vote_type = 'like' THEN 1 END) AS likes,
                COUNT(CASE WHEN vote_type = 'dislike' THEN 1 END) AS dislikes
            FROM votes 
            WHERE literature_id = ?
        `;
        const [counts] = await pool.execute(countQuery, [literature_id]);

        res.json({ 
            likes: counts[0].likes, 
            dislikes: counts[0].dislikes 
        });
    } catch (error) {
        console.error("Database Vote Error: ", error);
        res.status(500).json({ error: "Could not cast vote." });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server listening at http://localhost:${PORT}`);
});
