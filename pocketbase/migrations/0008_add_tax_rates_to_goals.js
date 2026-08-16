migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('goals')
    if (!col.fields.getByName('tax_meta_rate')) {
      col.fields.add(new NumberField({ name: 'tax_meta_rate', min: 0 }))
    }
    if (!col.fields.getByName('sales_tax_rate')) {
      col.fields.add(new NumberField({ name: 'sales_tax_rate', min: 0 }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('goals')
    if (col.fields.getByName('tax_meta_rate')) {
      col.fields.removeByName('tax_meta_rate')
    }
    if (col.fields.getByName('sales_tax_rate')) {
      col.fields.removeByName('sales_tax_rate')
    }
    app.save(col)
  },
)
