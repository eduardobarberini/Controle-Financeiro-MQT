migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('paid_launches')

    // Class sessions: editable list of delivered classes per launch
    if (!col.fields.getByName('class_sessions')) {
      col.fields.add(
        new JSONField({
          name: 'class_sessions',
          required: false,
        }),
      )
    }

    // Commercial sales: editable list of enterprise/commercial deals per launch
    if (!col.fields.getByName('commercial_sales')) {
      col.fields.add(
        new JSONField({
          name: 'commercial_sales',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('paid_launches')
    for (const name of ['class_sessions', 'commercial_sales']) {
      const field = col.fields.getByName(name)
      if (field) {
        col.fields.remove(field)
      }
    }
    app.save(col)
  },
)
