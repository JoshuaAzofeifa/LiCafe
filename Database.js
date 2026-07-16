import mysql from 'mysql2'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import session from 'express-session'
import MySQLStore from 'express-mysql-session'

dotenv.config()

const app = express()

app.use(cors({
    origin: ['https://licafe.publicvm.com', 'http://licafe.publicvm.com'],
    credentials: true
}))

app.use(express.json())

if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    app.set('trust proxy', 1)
}

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise()

const SessionStore = MySQLStore(session)
const sessionStore = new SessionStore({}, pool)

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
        const [rows] = await pool.execute(
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
        const
