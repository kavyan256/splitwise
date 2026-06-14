//contains the routes for authentication

const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { db } = require('../config/db')
const crypto = require('crypto')
const authenticate = require('../middleware/auth')

router.post('/register', async(req, res) => {
    try {
        const { username, email, password } = req.body

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' })
        }

        const existingUser = await db('users').where({ email }).first()
        if (existingUser) {
            return res.status(409).json({ message: 'Email already in use' })
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const [user] = await db('users')
                        .insert({ username, email, password_hash: hashedPassword })
                        .returning(['id', 'email', 'username'])

        res.status(201).json({ message: 'User registered successfully', user: user })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Server error' })
    }
})

router.post('/login', async(req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' })
        }

        const user = await db('users').where({ email }).first()
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' })
        }

        const isMatch = await bcrypt.compare(password, user.password_hash)
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' })
        }

        const access_token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' })
        
        const refresh_token = crypto.randomUUID();
        const refresh_token_hash = await bcrypt.hash(refresh_token, 12)

        await db('refresh_tokens').insert({ user_id: user.id, token_hash: refresh_token_hash, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })

        res.json({ message: 'Login successful', token: access_token, refresh_token: refresh_token })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Server error' })
    }
})

router.post('/logout',authenticate, async(req, res) => {
    try {
        await db('refresh_tokens').where({ user_id: req.user.userId }).delete()
        res.json({ message: 'Logout successful' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Server error' })
    }
})

router.post('/refresh', async(req, res) => {
    try {
        const { refresh_token, user_id } = req.body

        if (!refresh_token) {
            return res.status(400).json({ message: 'Refresh token is required' })
        }

        const tokenRecord = await db('refresh_tokens').where({ user_id: user_id }).first()
        if (!tokenRecord) {
            return res.status(401).json({ message: 'Invalid refresh token' })
        }

        const isValid = await bcrypt.compare(refresh_token, tokenRecord.token_hash)
        if (!isValid || new Date(tokenRecord.expires_at) < new Date()) {
            return res.status(401).json({ message: 'Invalid or expired refresh token' })
        }

        const user = await db('users').where({ id: user_id }).first()
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        await db('refresh_tokens').where({ user_id: user_id }).delete()

        const access_token = jwt.sign({ userId: user_id }, process.env.JWT_SECRET, { expiresIn: '15m' })
        const new_refresh_token = crypto.randomUUID();
        const new_refresh_token_hash = await bcrypt.hash(new_refresh_token, 12)
        
        await db('refresh_tokens').insert({ user_id: user_id, token_hash: new_refresh_token_hash, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })

        res.json({ token: access_token, refresh_token: new_refresh_token })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Server error' })
    }
})

module.exports = router