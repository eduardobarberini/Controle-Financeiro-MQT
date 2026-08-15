migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const goalsCol = app.findCollectionByNameOrId('goals')
    const monthlyDataCol = app.findCollectionByNameOrId('monthly_data')

    const email = 'eduardo@body4you.com.br'
    let userRecord

    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', email)
    } catch (_) {
      userRecord = new Record(usersCol)
      userRecord.setEmail(email)
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'Eduardo')
      app.save(userRecord)
    }

    const userId = userRecord.id

    // 1. Seed Goals for 2026
    try {
      const existingGoals = app.findRecordsByFilter(
        'goals',
        `user = '${userId}' && year = 2026`,
        '',
        1,
        0,
      )
      if (!existingGoals || existingGoals.length === 0) {
        const goalRecord = new Record(goalsCol)
        goalRecord.set('user', userId)
        goalRecord.set('year', 2026)
        goalRecord.set('annual_revenue_goal', 500000)
        goalRecord.set('annual_profit_goal', 150000)
        app.save(goalRecord)
      }
    } catch (_) {}

    // 2. Seed 12 months for 2026
    const sampleMonths = [
      {
        month: '2026-01-01 00:00:00.000Z',
        investment: 8500,
        gross_revenue: 24000,
        net_profit: 6200,
      },
      {
        month: '2026-02-01 00:00:00.000Z',
        investment: 9200,
        gross_revenue: 26500,
        net_profit: 7100,
      },
      {
        month: '2026-03-01 00:00:00.000Z',
        investment: 10000,
        gross_revenue: 30000,
        net_profit: 8400,
      },
      {
        month: '2026-04-01 00:00:00.000Z',
        investment: 11500,
        gross_revenue: 33000,
        net_profit: 9100,
      },
      {
        month: '2026-05-01 00:00:00.000Z',
        investment: 12000,
        gross_revenue: 35500,
        net_profit: 9800,
      },
      {
        month: '2026-06-01 00:00:00.000Z',
        investment: 13000,
        gross_revenue: 38000,
        net_profit: 10500,
      },
      {
        month: '2026-07-01 00:00:00.000Z',
        investment: 14200,
        gross_revenue: 41000,
        net_profit: 11200,
      },
      {
        month: '2026-08-01 00:00:00.000Z',
        investment: 15000,
        gross_revenue: 44500,
        net_profit: 12300,
      },
      {
        month: '2026-09-01 00:00:00.000Z',
        investment: 16000,
        gross_revenue: 47000,
        net_profit: 13000,
      },
      {
        month: '2026-10-01 00:00:00.000Z',
        investment: 17500,
        gross_revenue: 50000,
        net_profit: 14000,
      },
      {
        month: '2026-11-01 00:00:00.000Z',
        investment: 18000,
        gross_revenue: 52000,
        net_profit: 14500,
      },
      {
        month: '2026-12-01 00:00:00.000Z',
        investment: 20000,
        gross_revenue: 58000,
        net_profit: 16000,
      },
    ]

    for (let i = 0; i < sampleMonths.length; i++) {
      const item = sampleMonths[i]
      try {
        const existing = app.findRecordsByFilter(
          'monthly_data',
          `user = '${userId}' && month >= '${item.month.substring(0, 10)} 00:00:00.000Z' && month <= '${item.month.substring(0, 10)} 23:59:59.999Z'`,
          '',
          1,
          0,
        )
        if (!existing || existing.length === 0) {
          const mRecord = new Record(monthlyDataCol)
          mRecord.set('user', userId)
          mRecord.set('month', item.month)
          mRecord.set('investment', item.investment)
          mRecord.set('gross_revenue', item.gross_revenue)
          mRecord.set('net_profit', item.net_profit)
          app.save(mRecord)
        }
      } catch (_) {}
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'eduardo@body4you.com.br')
      app.delete(user)
    } catch (_) {}
  },
)
