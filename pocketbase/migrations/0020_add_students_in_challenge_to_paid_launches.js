migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('paid_launches')

    if (!collection.fields.getByName('students_in_challenge')) {
      collection.fields.add(
        new NumberField({
          name: 'students_in_challenge',
          required: false,
        }),
      )
      app.save(collection)
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('paid_launches')
    const field = collection.fields.getByName('students_in_challenge')
    if (field) {
      collection.fields.remove('students_in_challenge')
      app.save(collection)
    }
  },
)
