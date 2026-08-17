migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('paid_launches')

    // Replace 'batch' select field with 'batch' text field
    const oldField = col.fields.getByName('batch')
    if (oldField) {
      col.fields.removeByName('batch')
    }

    col.fields.add(
      new TextField({
        name: 'batch',
        required: true,
      }),
    )

    app.save(col)
  },
  (app) => {
    // Revert back if needed (optional)
    const col = app.findCollectionByNameOrId('paid_launches')
    const field = col.fields.getByName('batch')
    if (field) {
      col.fields.removeByName('batch')
    }
    col.fields.add(
      new SelectField({
        name: 'batch',
        required: true,
        values: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
        maxSelect: 1,
      }),
    )
    app.save(col)
  },
)
