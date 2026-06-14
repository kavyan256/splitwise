const express = require('express')
const router = express.Router()
const authenticate = require('../middleware/auth')
const { db } = require('../config/db')
const { calculateSplits } = require('../utils/splits')
const { redis } = require('../config/redis')

//create a new expense
router.post('/', authenticate, async (req, res) => {
    try {
        const { groupId, paidBy, description, amount, currency, splitType, date, splits, members } = req.body
        const userId = req.user.userId

        if( !amount || !groupId || !splitType || !date || !paidBy ) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        //check requester is part of the group
        const requester = await db('group_members').where({ group_id: groupId, user_id: userId }).first()
        if (!requester) {
            return res.status(403).json({ error: 'You are not a member of this group' })
        }

        //check paidBy is part of the group
        const payer = await db('group_members').where({ group_id: groupId, user_id: paidBy }).first()
        if (!payer) {
            return res.status(400).json({ error: 'Payer must be a member of the group' })
        }

        //fetch all group members
        const groupMembers = await db('group_members').where({ group_id: groupId }).pluck('user_id')

        //calculate splits
        const calculatedSplits = calculateSplits(amount, splitType, splits, groupMembers)

        const splitsWithPayment = calculatedSplits.map(split => ({
            ...split,
            paid_amount: split.user_id === paidBy ? split.owed_amount : 0
        }))

        //insert expense and splits in a transaction
        const expense = await db.transaction(async trx => {
            //insert expense
            const [newExpense] = await trx('expenses').insert({
                group_id: groupId,
                paid_by: paidBy,
                created_by: userId,
                description,
                amount,
                currency,
                split_type: splitType,
                expense_date: date
            }).returning('*')

            //insert splits
            const splitInserts = splitsWithPayment.map(split => ({
                expense_id: newExpense.id,
                user_id: split.user_id,
                owed_amount: split.owed_amount,
                paid_amount: split.paid_amount
            }))
            await trx('expense_splits').insert(splitInserts)

            return newExpense
        })

        await redis.publish(`group:${groupId}`, JSON.stringify({ type: 'expense_added', expense, groupId }))

        res.status(201).json({ message: 'Expense created successfully', expense })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

module.exports = router
