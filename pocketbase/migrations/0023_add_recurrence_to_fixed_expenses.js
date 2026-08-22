migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('fixed_expenses')

    // Guard: skip if the field already exists.
    if (!col.fields.getByName('recurrence')) {
      col.fields.add(
        new SelectField({
          name: 'recurrence',
          required: true,
          values: ['pontual', 'mensal', 'trimestral', 'semestral', 'anual'],
          maxSelect: 1,
        }),
      )
    }

    app.save(col)

    // Backfill existing rows so the required field has a valid value.
    app
      .db()
      .newQuery(
        `UPDATE fixed_expenses SET recurrence = {:recurrence} WHERE recurrence IS NULL OR recurrence = ''`,
      )
      .bind({ recurrence: 'pontual' })
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('fixed_expenses')
    const field = col.fields.getByName('recurrence')
    if (field) {
      col.fields.remove(field)
      app.save(col)
    }
  },
)
