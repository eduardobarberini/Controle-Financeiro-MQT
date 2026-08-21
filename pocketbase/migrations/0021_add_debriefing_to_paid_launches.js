migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('paid_launches')

    if (!collection.fields.getByName('debriefing')) {
      collection.fields.add(
        new TextField({
          name: 'debriefing',
          required: false,
        }),
      )
      app.save(collection)
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('paid_launches')
    const field = collection.fields.getByName('debriefing')
    if (field) {
      collection.fields.remove('debriefing')
      app.save(collection)
    }
  },
)
