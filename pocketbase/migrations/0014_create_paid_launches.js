migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const collection = new Collection({
      name: 'paid_launches',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
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
          name: 'capture_days',
          type: 'number',
          min: 0,
        },
        {
          name: 'batch',
          type: 'select',
          required: true,
          values: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
          maxSelect: 1,
        },
        {
          name: 'ticket_ticket',
          type: 'number',
          min: 0,
        },
        {
          name: 'traffic_investment',
          type: 'number',
          min: 0,
        },
        {
          name: 'total_ticket_sales',
          type: 'number',
          min: 0,
        },
        {
          name: 'ticket_refunds',
          type: 'number',
          min: 0,
        },
        {
          name: 'bump_ticket',
          type: 'number',
          min: 0,
        },
        {
          name: 'bump_sales',
          type: 'number',
          min: 0,
        },
        {
          name: 'bump_refunds',
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
      indexes: ['CREATE INDEX idx_paid_launches_user ON paid_launches (user)'],
    })

    app.save(collection)

    // Seed initial row for default admin user if available
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'eduardo@body4you.com.br')

      const record1 = new Record(collection)
      record1.set('user', admin.id)
      record1.set('capture_days', 10)
      record1.set('batch', 'Semana 1')
      record1.set('ticket_ticket', 47)
      record1.set('traffic_investment', 2500)
      record1.set('total_ticket_sales', 150)
      record1.set('ticket_refunds', 3)
      record1.set('bump_ticket', 27)
      record1.set('bump_sales', 45)
      record1.set('bump_refunds', 1)
      app.save(record1)

      const record2 = new Record(collection)
      record2.set('user', admin.id)
      record2.set('capture_days', 14)
      record2.set('batch', 'Semana 2')
      record2.set('ticket_ticket', 47)
      record2.set('traffic_investment', 3500)
      record2.set('total_ticket_sales', 220)
      record2.set('ticket_refunds', 5)
      record2.set('bump_ticket', 27)
      record2.set('bump_sales', 78)
      record2.set('bump_refunds', 2)
      app.save(record2)
    } catch (_) {
      // Admin user might not exist in some environments, ignore
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('paid_launches')
      app.delete(collection)
    } catch (_) {}
  },
)
