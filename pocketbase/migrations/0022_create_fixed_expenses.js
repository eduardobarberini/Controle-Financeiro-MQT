migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1) fixed_expense_categories -------------------------------
    const categoriesCollection = new Collection({
      name: 'fixed_expense_categories',
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
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true, min: 1, max: 100 },
        {
          name: 'color',
          type: 'text',
          required: true,
          pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
        },
        { name: 'description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_fixed_expense_categories_user ON fixed_expense_categories (user)',
      ],
    })
    app.save(categoriesCollection)

    // 2) fixed_expenses ----------------------------------------
    const expensesCollection = new Collection({
      name: 'fixed_expenses',
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
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'category',
          type: 'relation',
          required: true,
          collectionId: categoriesCollection.id,
          cascadeDelete: false,
          minSelect: 1,
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true, min: 1, max: 200 },
        { name: 'amount', type: 'number', required: true, min: 0 },
        { name: 'due_day', type: 'number', required: true, min: 1, max: 31, onlyInt: true },
        { name: 'month', type: 'number', required: true, min: 1, max: 12, onlyInt: true },
        { name: 'year', type: 'number', required: true, min: 2000, max: 2100, onlyInt: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pago', 'pendente'],
          maxSelect: 1,
        },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_fixed_expenses_user ON fixed_expenses (user)',
        'CREATE INDEX idx_fixed_expenses_user_period ON fixed_expenses (user, year, month)',
        'CREATE INDEX idx_fixed_expenses_category ON fixed_expenses (category)',
      ],
    })
    app.save(expensesCollection)

    // 3) Seed sample data for the demo user --------------------
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'eduardo@mqtnegociosdigitais.com.br',
      )
    } catch (_) {
      try {
        userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'eduardo@body4you.com.br')
      } catch (e2) {
        // No seeded user — skip seeding
        return
      }
    }
    const userId = userRecord.id

    const catCol = app.findCollectionByNameOrId('fixed_expense_categories')
    const expCol = app.findCollectionByNameOrId('fixed_expenses')

    const seedCats = [
      { name: 'Aluguel', color: '#6D49F2', description: 'Aluguel do escritório' },
      { name: 'Internet', color: '#0EA5E9', description: 'Internet fibra 300MB' },
      { name: 'Energia', color: '#F59E0B', description: 'Conta de energia elétrica' },
      { name: 'Softwares', color: '#10B981', description: 'Assinaturas de ferramentas' },
      { name: 'Marketing', color: '#EC4899', description: 'Tráfego pago recorrente' },
    ]

    const catIds = []
    for (let i = 0; i < seedCats.length; i++) {
      const item = seedCats[i]
      // Idempotent: skip if a category with same name already exists for this user
      let exists = []
      try {
        exists = app.findRecordsByFilter(
          'fixed_expense_categories',
          `user = '${userId}' && name = '${item.name.replace(/'/g, "\\'")}'`,
          '',
          1,
          0,
        )
      } catch (_) {}
      if (exists && exists.length > 0) {
        catIds.push(exists[0].id)
        continue
      }
      const record = new Record(catCol)
      record.set('user', userId)
      record.set('name', item.name)
      record.set('color', item.color)
      record.set('description', item.description)
      app.save(record)
      catIds.push(record.id)
    }

    const now = new Date()
    const curYear = now.getFullYear()
    const curMonth = now.getMonth() + 1

    const seedExpenses = [
      {
        catIdx: 0,
        description: 'Aluguel do escritório',
        amount: 2500,
        due_day: 5,
        month: curMonth,
        year: curYear,
        status: 'pendente',
        notes: 'Vencimento todo dia 5',
      },
      {
        catIdx: 1,
        description: 'Internet fibra 300MB',
        amount: 129.9,
        due_day: 10,
        month: curMonth,
        year: curYear,
        status: 'pago',
        notes: '',
      },
      {
        catIdx: 2,
        description: 'Conta de energia elétrica',
        amount: 480,
        due_day: 15,
        month: curMonth,
        year: curYear,
        status: 'pendente',
        notes: 'Valor médio',
      },
      {
        catIdx: 3,
        description: 'Assinatura ferramentas',
        amount: 350,
        due_day: 20,
        month: curMonth,
        year: curYear,
        status: 'pago',
        notes: 'Canva, Notion, etc.',
      },
      {
        catIdx: 4,
        description: 'Tráfego pago recorrente',
        amount: 1500,
        due_day: 25,
        month: curMonth,
        year: curYear,
        status: 'pendente',
        notes: '',
      },
    ]

    for (let i = 0; i < seedExpenses.length; i++) {
      const item = seedExpenses[i]
      const categoryId = catIds[item.catIdx]
      if (!categoryId) continue
      // Idempotent: skip if same expense already exists
      let exists = []
      try {
        exists = app.findRecordsByFilter(
          'fixed_expenses',
          `user = '${userId}' && category = '${categoryId}' && description = '${item.description.replace(/'/g, "\\'")}' && year = ${item.year} && month = ${item.month}`,
          '',
          1,
          0,
        )
      } catch (_) {}
      if (exists && exists.length > 0) continue

      const record = new Record(expCol)
      record.set('user', userId)
      record.set('category', categoryId)
      record.set('description', item.description)
      record.set('amount', item.amount)
      record.set('due_day', item.due_day)
      record.set('month', item.month)
      record.set('year', item.year)
      record.set('status', item.status)
      record.set('notes', item.notes)
      app.save(record)
    }
  },
  (app) => {
    try {
      const expenses = app.findCollectionByNameOrId('fixed_expenses')
      app.delete(expenses)
    } catch (_) {}
    try {
      const categories = app.findCollectionByNameOrId('fixed_expense_categories')
      app.delete(categories)
    } catch (_) {}
  },
)
