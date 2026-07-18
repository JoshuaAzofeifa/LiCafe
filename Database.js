import mysql from 'mysql2'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import session from 'express-session'
import MySQLStore from 'express-mysql-session'
import { fileURLToPath } from 'url'
import path from 'path'

dotenv.config()

const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.static(__dirname))

app.use(cors({
    origin: [
        'https://licafe-frontend.onrender.com',
        'https://licafe.onrender.com',          
        'http://licafe.freedomain.one',
        'https://www.licafe.freedomain.one',
        'http://www.licafe.freedomain.one',
        'https://licafe.publicvm.com', 
        'http://licafe.publicvm.com',
        'https://www.licafe.publicvm.com', 
        'http://www.licafe.publicvm.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    app.set('trust proxy', 1)
}

const pool = mysql.createPool({
    host: 'b5q446tg6em6npyl1wfq-mysql.services.clever-cloud.com',
    user: 'uh8ptfvbeyl7d5qr',
    password: 'IGer2g22EXKcDhrvsg4s',
    database: 'b5q446tg6em6npyl1wfq',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

const promisePool = pool.promise()

const SessionStore = MySQLStore(session)
const sessionStore = new SessionStore({
    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: 86400000,
    createDatabaseTable: true
}, pool)

app.use(session({
    key: 'session_id',
    secret: process.env.SESSION_SECRET || 'your_secret_key_change_me',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: true,        
        httpOnly: true,
        sameSite: 'none',    
        maxAge: 1000 * 60 * 60 * 24 
    }
}))

function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        next()
    } else {
        res.status(401).json({ error: "Not authenticated. Please log in." })
    }
}

function validateInput(input, type = 'string', minLength = 1, maxLength = 255) {
    if (typeof input !== 'string') return false
    if (input.trim().length < minLength || input.trim().length > maxLength) return false
    return true
}

async function getUserByUsername(username) {
    try {
        const [rows] = await promisePool.execute(
            'SELECT * FROM users WHERE username = ?', 
            [username]
        )
        return rows[0]
    } catch (error) {
        console.error('Error fetching user:', error)
        throw error
    }
}

async function getUserById(userId) {
    try {
        const [rows] = await promisePool.execute(
            'SELECT id, username, email FROM users WHERE id = ?', 
            [userId]
        )
        return rows[0]
    } catch (error) {
        console.error('Error fetching user by ID:', error)
        throw error
    }
}

async function createUser(username, email, password_hash) {
    try {
        const [result] = await promisePool.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', 
            [username, email, password_hash]
        )
        return result.insertId
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            throw new Error('Username or email already exists')
        }
        console.error('Error creating user:', error)
        throw error
    }
}

async function createLiterature(title, writer_id, genre, summary, pdf_url) {
    try {
        const [result] = await promisePool.execute(
            'INSERT INTO literature (title, writer_id, Genre, Summary, pdf_url, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [title, writer_id, genre, summary, pdf_url]
        )
        return result.insertId
    } catch (error) {
        console.error('Error creating literature:', error)
        throw error
    }
}

app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body

        if (!validateInput(username, 'string', 3, 50)) {
            return res.status(400).json({ error: "Username must be 3-50 characters" })
        }
        if (!validateInput(email, 'string', 5, 100) || !email.includes('@')) {
            return res.status(400).json({ error: "Invalid email format" })
        }
        if (!validateInput(password, 'string', 6, 255)) {
            return res.status(400).json({ error: "Password must be at least 6 characters" })
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match" })
        }

        const existingUser = await getUserByUsername(username)
        if (existingUser) {
            return res.status(409).json({ error: "Username already exists" })
        }

        const password_hash = await bcrypt.hash(password, 10)

        const userId = await createUser(username, email, password_hash)

        req.session.userId = userId
        req.session.username = username

        res.status(201).json({ 
            message: "User registered successfully!", 
            userId,
            user: { id: userId, username }
        })
    } catch (error) {
        console.error('Registration error:', error)
        res.status(500).json({ error: error.message || "Could not register user." })
    }
})

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body

        if (!validateInput(username, 'string', 1, 50)) {
            return res.status(400).json({ error: "Invalid username" })
        }
        if (!validateInput(password, 'string', 1, 255)) {
            return res.status(400).json({ error: "Invalid password" })
        }

        const user = await getUserByUsername(username)
        if (!user) {
            return res.status(401).json({ error: "Invalid username or password" })
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash)
        if (!isValidPassword) {
            return res.status(401).json({ error: "Invalid username or password" })
        }

        req.session.userId = user.id
        req.session.username = user.username

        res.json({ 
            message: "Login successful", 
            user: { id: user.id, username: user.username } 
        })
    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ error: "Login failed" })
    }
})

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Could not logout" })
        }
        res.json({ message: "Logged out successfully" })
    })
})

app.get('/api/user', isAuthenticated, async (req, res) => {
    try {
        const user = await getUserById(req.session.userId)
        if (!user) {
            return res.status(404).json({ error: "User not found" })
        }
        res.json(user)
    } catch (error) {
        console.error('Error fetching user:', error)
        res.status(500).json({ error: "Could not fetch user" })
    }
})

app.post('/api/publish', isAuthenticated, async (req, res) => {
    try {
        const { title, genre, summary } = req.body
        const writer_id = req.session.userId

        if (!validateInput(title, 'string', 1, 255)) {
            return res.status(400).json({ error: "Title is required (max 255 characters)" })
        }
        if (!validateInput(genre, 'string', 1, 100)) {
            return res.status(400).json({ error: "Genre is required (max 100 characters)" })
        }
        if (!validateInput(summary, 'string', 1, 1000)) {
            return res.status(400).json({ error: "Summary is required (max 1000 characters)" })
        }

        const placeholder_pdf = "uploads/default.pdf"

        const litId = await createLiterature(title, writer_id, genre, summary, placeholder_pdf)
        
        res.status(201).json({ 
            message: "Literature added to the shelf successfully!", 
            literatureId: litId 
        })
    } catch (error) {
        console.error("Database Insert Error:", error)
        res.status(500).json({ error: "Could not publish literature to the database." })
    }
})

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
                u.id AS author_id,
                COUNT(CASE WHEN v.vote_type = 'like' THEN 1 END) AS likes,
                COUNT(CASE WHEN v.vote_type = 'dislike' THEN 1 END) AS dislikes
            FROM literature l
            JOIN users u ON l.writer_id = u.id
            LEFT JOIN votes v ON l.id = v.literature_id
            GROUP BY l.id, l.title, l.Summary, l.Genre, l.pdf_url, u.username, u.id
            ORDER BY l.created_at DESC
        `
        const [rows] = await promisePool.execute(query)
        res.json(rows)
    } catch (error) {
        console.error("Database Fetch Error:", error)
        res.status(500).json({ error: "Could not fetch literature feed." })
    }
})

app.get('/api/literature/:id', async (req, res) => {
    try {
        const { id } = req.params

        if (!Number.isInteger(parseInt(id))) {
            return res.status(400).json({ error: "Invalid literature ID" })
        }

        const query = `
            SELECT 
                l.id, 
                l.title, 
                l.Summary AS summary, 
                l.Genre AS genre,
                l.pdf_url, 
                u.username AS author,
                u.id AS author_id,
                COUNT(CASE WHEN v.vote_type = 'like' THEN 1 END) AS likes,
                COUNT(CASE WHEN v.vote_type = 'dislike' THEN 1 END) AS dislikes
            FROM literature l
            JOIN users u ON l.writer_id = u.id
            LEFT JOIN votes v ON l.id = v.literature_id
            WHERE l.id = ?
            GROUP BY l.id, l.title, l.Summary, l.Genre, l.pdf_url, u.username, u.id
        `
        const [rows] = await promisePool.execute(query, [id])
        
        if (rows.length === 0) {
            return res.status(404).json({ error: "Literature not found" })
        }

        res.json(rows[0])
    } catch (error) {
        console.error("Database Fetch Error:", error)
        res.status(500).json({ error: "Could not fetch literature." })
    }
})

app.post('/api/vote', isAuthenticated, async (req, res) => {
    try {
        const { literature_id, vote_type } = req.body
        const user_id = req.session.userId

        if (!Number.isInteger(parseInt(literature_id))) {
            return res.status(400).json({ error: "Invalid literature ID" })
        }
        if (!['like', 'dislike'].includes(vote_type)) {
            return res.status(400).json({ error: "Invalid vote type" })
        }

        const voteQuery = `
            INSERT INTO votes (users_id, literature_id, vote_type) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE vote_type = VALUES(vote_type)
        `
        await promisePool.execute(voteQuery, [user_id, literature_id, vote_type])

        const countQuery = `
            SELECT 
                COUNT(CASE WHEN vote_type = 'like' THEN 1 END) AS likes,
                COUNT(CASE WHEN vote_type = 'dislike' THEN 1 END) AS dislikes
            FROM votes 
            WHERE literature_id = ?
        `
        const [counts] = await promisePool.execute(countQuery, [literature_id])

        res.json({ 
            message: "Vote recorded successfully",
            likes: (counts[0] && counts[0].likes) || 0, 
            dislikes: (counts[0] && counts[0].dislikes) || 0 
        })
    } catch (error) {
        console.error("Database Vote Error:", error)
        res.status(500).json({ error: "Could not cast vote." })
    }
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index2.html'))
})

app.get('/:page', (req, res, next) => {
    const ext = path.extname(req.params.page)
    if (ext === '.html' || ext === '') {
        const targetFile = ext === '' ? `${req.params.page}.html` : req.params.page
        return res.sendFile(path.join(__dirname, targetFile), (err) => {
            if (err) {
                res.sendFile(path.join(__dirname, 'index2.html'))
            }
        })
    }
    next()
})

app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index2.html'))
})

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err)
    res.status(500).json({ error: "Internal server error" })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening dynamically on port ${PORT}`)
})
