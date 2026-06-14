// Function 1 — calculate net balances from splits
function calculateNetBalances(expenseSplits) {
  const balances = {}
  expenseSplits.forEach(split => {
    const net = parseFloat(split.paid_amount) - parseFloat(split.owed_amount)
    balances[split.user_id] = (balances[split.user_id] || 0) + net
  })
  return balances
}

// Function 2 — simplify debts (the greedy algorithm)
function simplifyDebts(balances) {
    const creditors = []
    const debtors = []

    for (const userId in balances) {
        const amount = balances[userId]
        if (amount > 0) {
            creditors.push({ user_id: userId, amount })
        } else if (amount < 0) {
            debtors.push({ user_id: userId, amount: -amount })
        }
    }

    const settlements = []
    let i = 0, j = 0

    while (i < creditors.length && j < debtors.length) {
        const credit = creditors[i]
        const debt = debtors[j]
        const settlementAmount = Math.min(credit.amount, debt.amount)

        settlements.push({
            from_user_id: debt.user_id,
            to_user_id: credit.user_id,
            amount: settlementAmount
        })

        credit.amount -= settlementAmount
        debt.amount -= settlementAmount

        if (credit.amount === 0) i++
        if (debt.amount === 0) j++
    }

    return settlements
}

module.exports = { calculateNetBalances, simplifyDebts }