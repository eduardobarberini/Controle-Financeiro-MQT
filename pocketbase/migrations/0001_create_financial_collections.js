migrate(
  (app) => {
    // 1. monthly_data collection
    const monthlyDataCollection = new Collection({
      name: 'monthly_data',
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
          name: 'month',
          type: 'date',
          required: true,
        },
        {
          name: 'investment',
          type: 'number',
          min: 0,
        },
        {
          name: 'gross_revenue',
          type: 'number',
          min: 0,
        },
        {
          name: 'net_profit',
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
        'CREATE UNIQUE INDEX idx_monthly_data_user_month ON monthly_data (user, month)',
        'CREATE INDEX idx_monthly_data_month ON monthly_data (month)',
      ],
    })
    app.save(monthlyDataCollection)

    // 2. goals collection
    const goalsCollection = new Collection({
      name: 'goals',
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
          name: 'annual_revenue_goal',
          type: 'number',
          min: 0,
        },
        {
          name: 'annual_profit_goal',
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
      indexes: ['CREATE UNIQUE INDEX idx_goals_user_year ON goals (user, year)'],
    })
    app.save(goalsCollection)
  },
  (app) => {
    try {
      const goals = app.findCollectionByNameOrId('goals')
      app.delete(goals)
    } catch (_) {}

    try {
      const monthlyData = app.findCollectionByNameOrId('monthly_data')
      app.delete(monthlyData)
    } catch (_) {}
  },
)
