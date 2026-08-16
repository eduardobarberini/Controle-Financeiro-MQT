migrate(
  (app) => {
    // Create company_settings collection: per-user company name + logo file.
    const collection = new Collection({
      name: 'company_settings',
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
          name: 'company_name',
          type: 'text',
          required: false,
          min: 1,
          max: 120,
        },
        {
          name: 'logo',
          type: 'file',
          required: false,
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'],
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
      indexes: ['CREATE UNIQUE INDEX idx_company_settings_user ON company_settings (user)'],
    })
    app.save(collection)

    // Seed default company_settings for the existing seed user (idempotent).
    const email = 'eduardo@mqtnegociosdigitais.com.br'
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', email)
    } catch (_) {
      return // seed user not present yet; nothing to seed
    }

    const userId = userRecord.id
    try {
      const existing = app.findRecordsByFilter('company_settings', `user = '${userId}'`, '', 1, 0)
      if (existing && existing.length > 0) return
    } catch (_) {}

    const col = app.findCollectionByNameOrId('company_settings')
    const record = new Record(col)
    record.set('user', userId)
    record.set('company_name', 'MQT Negócios Digitais')
    app.save(record)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('company_settings')
      app.delete(col)
    } catch (_) {}
  },
)
