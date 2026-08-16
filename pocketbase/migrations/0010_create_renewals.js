migrate(
  (app) => {
    // Create the renewals collection — monthly renewal tracking (one row per month/year/user).
    const renewalsCollection = new Collection({
      name: 'renewals',
      type: 'base',
      listRule: "@request.auth.id != '' && user.id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user.id = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user.id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user.id = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'year',
          type: 'number',
          required: true,
        },
        {
          name: 'month',
          type: 'number',
          required: true,
          min: 1,
          max: 12,
          onlyInt: true,
        },
        {
          name: 'students_to_renew',
          type: 'number',
          min: 0,
        },
        {
          name: 'renewals',
          type: 'number',
          min: 0,
        },
        {
          name: 'renewal_revenue',
          type: 'number',
          min: 0,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_renewals_user_year_month ON renewals (user, year, month)'],
    })
    app.save(renewalsCollection)

    // Seed 12 months of 2026 for the demo user.
    const col = app.findCollectionByNameOrId('renewals')
    const email = 'eduardo@mqtnegociosdigitais.com.br'
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', email)
    } catch (_) {
      // user not seeded yet — skip seeding
      return
    }
    const userId = userRecord.id

    const seedMonths = [
      { month: 1, students_to_renew: 120, renewals: 86, renewal_revenue: 25800 },
      { month: 2, students_to_renew: 130, renewals: 95, renewal_revenue: 28500 },
      { month: 3, students_to_renew: 140, renewals: 108, renewal_revenue: 32400 },
      { month: 4, students_to_renew: 150, renewals: 118, renewal_revenue: 35400 },
      { month: 5, students_to_renew: 155, renewals: 121, renewal_revenue: 36300 },
      { month: 6, students_to_renew: 160, renewals: 128, renewal_revenue: 38400 },
      { month: 7, students_to_renew: 168, renewals: 134, renewal_revenue: 40200 },
      { month: 8, students_to_renew: 175, renewals: 142, renewal_revenue: 42600 },
      { month: 9, students_to_renew: 180, renewals: 147, renewal_revenue: 44100 },
      { month: 10, students_to_renew: 190, renewals: 158, renewal_revenue: 47400 },
      { month: 11, students_to_renew: 195, renewals: 162, renewal_revenue: 48600 },
      { month: 12, students_to_renew: 210, renewals: 178, renewal_revenue: 53400 },
    ]

    for (let i = 0; i < seedMonths.length; i++) {
      const item = seedMonths[i]
      // Idempotent: skip if already exists
      try {
        const existing = app.findRecordsByFilter(
          'renewals',
          `user = '${userId}' && year = 2026 && month = ${item.month}`,
          '',
          1,
          0,
        )
        if (existing && existing.length > 0) continue
      } catch (_) {}

      const record = new Record(col)
      record.set('user', userId)
      record.set('year', 2026)
      record.set('month', item.month)
      record.set('students_to_renew', item.students_to_renew)
      record.set('renewals', item.renewals)
      record.set('renewal_revenue', item.renewal_revenue)
      app.save(record)
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('renewals')
      app.delete(collection)
    } catch (_) {}
  },
)
