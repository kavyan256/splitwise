const express = require('express')
const router = express.Router()
const authenticate = require('../middleware/auth')
const { db } = require('../config/db')
const { calculateNetBalances, simplifyDebts } = require('../utils/debts')
const { subscriber } = require('../config/redis')

//list of routes
//1. POST / - create a new group
//2. GET / - get all groups for the user
//3. GET /:id/net-balances - get net balances and settlements for the group
//4. GET /:id/settlements - get all settlements for the group
//5. POST /:id/settlements - create a settlement for the group
//6. GET /:id/events - get group events (expenses and settlements) in chronological order
//7. GET /:id - get group details along with members and expenses and settlements
//8. POST /:id/members - add a member to the group

//create a new group
router.post('/', authenticate, async (req, res) => {
    try {
        const { name, description, currency } = req.body
        const userId = req.user.userId

        //check if user already has group with that name
        const exists = await db('groups')
            .where({ name, created_by: userId })
            .first()

        if (exists) {
            return res.status(400).json({ error: 'Group with that name already exists' })
        }

        // Create a new group
        const [group] = await db('groups')
            .insert({ name, description, currency, created_by: userId })
            .returning('*')
        
        // Add the creator as a admin of the group
        await db('group_members')
            .insert({ group_id: group.id, user_id: userId, role: 'admin' })

        res.status(201).json({ group })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

//get all groups for the user
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId

        const groups = await db('group_members')
            .join('groups', 'group_members.group_id', 'groups.id')
            .select('groups.id', 'groups.name', 'groups.description', 'groups.currency', 'groups.created_by', 'groups.created_at')
            .where({ 'group_members.user_id': userId })

        res.status(200).json({ groups })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

//get net balances and settlements for the group
router.get('/:id/net-balances', authenticate, async (req, res) => {
    try {
        const groupId = req.params.id

        // Check if the group exists
        const group = await db('groups')
            .where({ id: groupId })
            .first()

        if (!group) {
            return res.status(404).json({ error: 'Group not found' })
        }

        // Check if the user is a member of the group
        const member = await db('group_members')
            .where({ group_id: groupId, user_id: req.user.userId })
            .first()

        if (!member) {
            return res.status(403).json({ error: 'You are not a member of this group' })
        }

        //fetch all expense splits for the group
        const expenseSplits = await db('expense_splits')
            .join('expenses', 'expense_splits.expense_id', 'expenses.id')
            .select('expense_splits.user_id', 'expense_splits.owed_amount', 'expense_splits.paid_amount')
            .where({ 'expenses.group_id': groupId })

        const netBalances = calculateNetBalances(expenseSplits)
        const settlements = simplifyDebts(netBalances)

        res.status(200).json({ netBalances, settlements })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

//get all settlements for the group
router.get('/:id/settlements', authenticate, async (req, res) => {
    try {
        const groupId = req.params.id

        // Check if the group exists
        const group = await db('groups')
            .where({ id: groupId })
            .first()

        if (!group) {
            return res.status(404).json({ error: 'Group not found' })
        }

        // Check if the user is a member of the group
        const member = await db('group_members')
            .where({ group_id: groupId, user_id: req.user.userId })
            .first()

        if (!member) {
            return res.status(403).json({ error: 'You are not a member of this group' })
        }

        const settlements = await db('settlements')
            .where({ group_id: groupId })

        res.status(200).json({ settlements })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

//create a settlement for the group
router.post('/:id/settlements', authenticate, async (req, res) => {
    try {
        const groupId = req.params.id
        const { to_user_id, amount } = req.body
        const userId = req.user.userId

        // Check if the group exists
        const group = await db('groups')
            .where({ id: groupId })
            .first()

        if (!group) {
            return res.status(404).json({ error: 'Group not found' })
        }

        // Check if the user is a member of the group
        const member = await db('group_members')
            .where({ group_id: groupId, user_id: userId })
            .first()

        if (!member) {
            return res.status(403).json({ error: 'You are not a member of this group' })
        }

        // Check if the to_user_id is a member of the group
        const toMember = await db('group_members')
            .where({ group_id: groupId, user_id: to_user_id })
            .first()

        if (!toMember) {
            return res.status(400).json({ error: 'Recipient must be a member of the group' })
        }

        await db('settlements')
            .insert({ group_id: groupId, payer_id: userId, payee_id: to_user_id, amount, currency: group.currency, status: 'pending' })

        res.status(201).json({ message: 'Settlement created successfully' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

//get group events (expenses and settlements) in chronological order
router.get('/:id/events', authenticate, async (req,res) => {
    const groupId = req.params.id

    //SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    //subscribe to the group's channel
    subscriber.subscribe(`group:${groupId}`, (err, count) => {
        if (err) {
            console.error('Failed to subscribe: ', err)
            res.status(500).json({ error: 'Internal server error' })
        } else {
            console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`)
        }
    })

    subscriber.on('message', (channel, message) => {
        if (channel === `group:${groupId}`) {
            res.write(`data: ${message}\n\n`)
        }
    })

    req.on('close', () => {
        console.log('Client disconnected')
        subscriber.unsubscribe(`group:${groupId}`)
    })    
})

//get group details
router.get('/:id', authenticate, async (req, res) => {
    try {
        const groupId = req.params.id

        // Check if the group exists
        const group = await db('groups')
            .where({ id: groupId })
            .first()

        if (!group) {
            return res.status(404).json({ error: 'Group not found' })
        }

        // Check if the user is a member of the group
        const member = await db('group_members')
            .where({ group_id: groupId, user_id: req.user.userId })
            .first()

        if (!member) {
            return res.status(403).json({ error: 'You are not a member of this group' })
        }

        //fetch group details along with members and expenses and settlements
        const members = await db('group_members')
            .join('users', 'group_members.user_id', 'users.id')
            .select('users.id', 'users.username', 'users.email', 'group_members.role', 'group_members.joined_at')
            .where({ 'group_members.group_id': groupId })

        const expenses = await db('expenses')
            .where({ group_id: groupId })

        const settlements = await db('settlements')
            .where({ group_id: groupId })

        res.status(200).json({ group, members, expenses, settlements })

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

//add a member to the group
router.post('/:id/members', authenticate, async (req, res) => {
    try {
        const groupId = req.params.id
        const { email, role } = req.body

        // Check if the group exists
        const group = await db('groups')
            .where({ id: groupId })
            .first()

        if (!group) {
            return res.status(404).json({ error: 'Group not found' })
        }

        // Check if the user is an admin of the group
        const member = await db('group_members')
            .where({ group_id: groupId, user_id: req.user.userId, role: 'admin' })
            .first()

        if (!member) {
            return res.status(403).json({ error: 'You are not an admin of this group' })
        }

        // Add the new member to the group
        const userToAdd = await db('users')
            .where({ email })
            .first()

        if (!userToAdd) {
            return res.status(404).json({ error: 'User not found' })
        }

        const existingMember = await db('group_members')
            .where({ group_id: groupId, user_id: userToAdd.id })
            .first()

        if (existingMember) {
            return res.status(400).json({ error: 'User is already a member of the group' })
        }

        await db('group_members')
            .insert({ group_id: groupId, user_id: userToAdd.id, role })

        res.status(201).json({ message: 'Member added successfully' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

module.exports = router
