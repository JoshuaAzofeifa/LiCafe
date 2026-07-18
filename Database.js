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

app.use(express.static(path.join(__dirname, 'public')))

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
