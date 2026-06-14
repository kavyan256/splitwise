function calculateSplits(amount, splitType, splits, members) {
  if (splitType === 'equal') {
    const splitAmount = amount / members.length
    return members.map(userId => ({
      user_id: userId,
      owed_amount: splitAmount,
      paid_amount: 0
    }))
  }

  if (splitType === 'percentage') {
    const total = splits.reduce((sum, s) => sum + s.percentage, 0)
    if (Math.abs(total - 100) > 0.01) throw new Error('Percentages must add up to 100')
    return splits.map(s => ({
      user_id: s.user_id,
      owed_amount: (s.percentage / 100) * amount,
      paid_amount: 0
    }))
  }

  if (splitType === 'exact') {
    const total = splits.reduce((sum, s) => sum + s.amount, 0)
    if (Math.abs(total - amount) > 0.01) throw new Error('Exact amounts must add up to total')
    return splits.map(s => ({
      user_id: s.user_id,
      owed_amount: s.amount,
      paid_amount: 0
    }))
  }

  throw new Error('Invalid split type')
}

module.exports = { calculateSplits }