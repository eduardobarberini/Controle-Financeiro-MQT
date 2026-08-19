migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('paid_launches')

    if (!col.fields.getByName('api_official_cost')) {
      col.fields.add(new NumberField({ name: 'api_official_cost', min: 0 }))
    }
    if (!col.fields.getByName('commercial_commission')) {
      col.fields.add(new NumberField({ name: 'commercial_commission', min: 0 }))
    }
    if (!col.fields.getByName('revenue_tax_rate')) {
      col.fields.add(new NumberField({ name: 'revenue_tax_rate', min: 0, max: 100 }))
    }
    if (!col.fields.getByName('traffic_tax_rate')) {
      col.fields.add(new NumberField({ name: 'traffic_tax_rate', min: 0, max: 100 }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('paid_launches')
    if (col.fields.getByName('api_official_cost')) col.fields.removeByName('api_official_cost')
    if (col.fields.getByName('commercial_commission'))
      col.fields.removeByName('commercial_commission')
    if (col.fields.getByName('revenue_tax_rate')) col.fields.removeByName('revenue_tax_rate')
    if (col.fields.getByName('traffic_tax_rate')) col.fields.removeByName('traffic_tax_rate')
    app.save(col)
  },
)
