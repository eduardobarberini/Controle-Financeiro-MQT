migrate(
  (app) => {
    // Create the monthly_details collection
    const monthlyDetailsCollection = new Collection({
      name: 'monthly_details',
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
          name: 'revenue',
          type: 'number',
          min: 0,
        },
        {
          name: 'investment',
          type: 'number',
          min: 0,
        },
        {
          name: 'ads_meta',
          type: 'number',
          min: 0,
        },
        {
          name: 'tax_meta',
          type: 'number',
          min: 0,
        },
        {
          name: 'sales_tax',
          type: 'number',
          min: 0,
        },
        {
          name: 'sales_commission',
          type: 'number',
          min: 0,
        },
        {
          name: 'other_variable_costs',
          type: 'number',
          min: 0,
        },
        {
          name: 'fixed_costs',
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
      indexes: [
        'CREATE UNIQUE INDEX idx_monthly_details_user_year_month ON monthly_details (user, year, month)',
      ],
    })
    app.save(monthlyDetailsCollection)

    // Seed 12 months of 2026 for eduardo@body4you.com.br
    const col = app.findCollectionByNameOrId('monthly_details')
    const email = 'eduardo@body4you.com.br'
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', email)
    } catch (_) {
      // user not seeded yet — skip seeding
      return
    }
    const userId = userRecord.id

    // Realistic demo values for each month (2026)
    const seedMonths = [
      {
        month: 1,
        revenue: 24000,
        investment: 8500,
        ads_meta: 6000,
        tax_meta: 200,
        sales_tax: 720,
        sales_commission: 1200,
        other_variable_costs: 150,
        fixed_costs: 5500,
      },
      {
        month: 2,
        revenue: 26500,
        investment: 9200,
        ads_meta: 6500,
        tax_meta: 220,
        sales_tax: 795,
        sales_commission: 1325,
        other_variable_costs: 160,
        fixed_costs: 5500,
      },
      {
        month: 3,
        revenue: 30000,
        investment: 10000,
        ads_meta: 7000,
        tax_meta: 250,
        sales_tax: 900,
        sales_commission: 1500,
        other_variable_costs: 180,
        fixed_costs: 5600,
      },
      {
        month: 4,
        revenue: 33000,
        investment: 11500,
        ads_meta: 8000,
        tax_meta: 280,
        sales_tax: 990,
        sales_commission: 1650,
        other_variable_costs: 190,
        fixed_costs: 5600,
      },
      {
        month: 5,
        revenue: 35500,
        investment: 12000,
        ads_meta: 8400,
        tax_meta: 300,
        sales_tax: 1065,
        sales_commission: 1775,
        other_variable_costs: 200,
        fixed_costs: 5700,
      },
      {
        month: 6,
        revenue: 38000,
        investment: 13000,
        ads_meta: 9000,
        tax_meta: 320,
        sales_tax: 1140,
        sales_commission: 1900,
        other_variable_costs: 210,
        fixed_costs: 5700,
      },
      {
        month: 7,
        revenue: 41000,
        investment: 14200,
        ads_meta: 9800,
        tax_meta: 340,
        sales_tax: 1230,
        sales_commission: 2050,
        other_variable_costs: 220,
        fixed_costs: 5800,
      },
      {
        month: 8,
        revenue: 44500,
        investment: 15000,
        ads_meta: 10200,
        tax_meta: 360,
        sales_tax: 1335,
        sales_commission: 2225,
        other_variable_costs: 230,
        fixed_costs: 5800,
      },
      {
        month: 9,
        revenue: 47000,
        investment: 16000,
        ads_meta: 10800,
        tax_meta: 380,
        sales_tax: 1410,
        sales_commission: 2350,
        other_variable_costs: 240,
        fixed_costs: 5900,
      },
      {
        month: 10,
        revenue: 50000,
        investment: 17500,
        ads_meta: 11800,
        tax_meta: 400,
        sales_tax: 1500,
        sales_commission: 2500,
        other_variable_costs: 250,
        fixed_costs: 5900,
      },
      {
        month: 11,
        revenue: 52000,
        investment: 18000,
        ads_meta: 12200,
        tax_meta: 420,
        sales_tax: 1560,
        sales_commission: 2600,
        other_variable_costs: 260,
        fixed_costs: 6000,
      },
      {
        month: 12,
        revenue: 58000,
        investment: 20000,
        ads_meta: 13500,
        tax_meta: 450,
        sales_tax: 1740,
        sales_commission: 2900,
        other_variable_costs: 280,
        fixed_costs: 6000,
      },
    ]

    for (let i = 0; i < seedMonths.length; i++) {
      const item = seedMonths[i]
      // Idempotent: skip if already exists
      try {
        const existing = app.findRecordsByFilter(
          'monthly_details',
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
      record.set('revenue', item.revenue)
      record.set('investment', item.investment)
      record.set('ads_meta', item.ads_meta)
      record.set('tax_meta', item.tax_meta)
      record.set('sales_tax', item.sales_tax)
      record.set('sales_commission', item.sales_commission)
      record.set('other_variable_costs', item.other_variable_costs)
      record.set('fixed_costs', item.fixed_costs)
      app.save(record)
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('monthly_details')
      app.delete(collection)
    } catch (_) {}
  },
)
