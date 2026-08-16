migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('goals')
    if (!col.fields.getByName('renewal_rate_goal')) {
      col.fields.add(
        new NumberField({
          name: 'renewal_rate_goal',
          required: false,
          min: 0,
          max: 100,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('goals')
    if (col.fields.getByName('renewal_rate_goal')) {
      col.fields.removeByName('renewal_rate_goal')
      app.save(col)
    }
  },
)
