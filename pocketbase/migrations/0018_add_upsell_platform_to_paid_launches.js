migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('paid_launches')
    if (!col.fields.getByName('upsell_platform')) {
      col.fields.add(
        new JSONField({
          name: 'upsell_platform',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('paid_launches')
    if (col.fields.getByName('upsell_platform')) {
      col.fields.removeByName('upsell_platform')
      app.save(col)
    }
  },
)
