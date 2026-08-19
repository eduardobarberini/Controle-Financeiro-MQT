migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('paid_launches')
    if (!col.fields.getByName('daily_data')) {
      col.fields.add(
        new JSONField({
          name: 'daily_data',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('paid_launches')
    const field = col.fields.getByName('daily_data')
    if (field) {
      col.fields.remove(field)
      app.save(col)
    }
  },
)
