migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('monthly_details')

    // Backfill the (soon-to-be-removed) `investment` value into `ads_meta`
    // for existing rows where ads_meta is empty/zero, so historical data is
    // preserved BEFORE the column is dropped.
    try {
      const rows = app.findRecordsByFilter('monthly_details', '', '', 0, 0)
      for (const r of rows) {
        const ads = Number(r.get('ads_meta')) || 0
        const inv = Number(r.get('investment')) || 0
        if (ads === 0 && inv > 0) {
          r.set('ads_meta', inv)
          app.save(r)
        }
      }
    } catch (_) {}

    // Remove the fields that are no longer manual inputs (they are now
    // auto-calculated on the client from ads_meta / revenue):
    //   - investment  -> replaced by `ads_meta` as the investment source
    //   - tax_meta    -> auto = ads_meta * 12.15%
    //   - sales_tax   -> auto = revenue * 7.5%
    for (const fieldName of ['investment', 'tax_meta', 'sales_tax']) {
      // removeByName is a no-op if the field doesn't exist.
      col.fields.removeByName(fieldName)
    }

    app.save(col)
  },
  (app) => {
    // Re-add the removed fields (best-effort revert).
    const col = app.findCollectionByNameOrId('monthly_details')
    if (!col.fields.getByName('investment')) {
      col.fields.add(new NumberField({ name: 'investment', min: 0 }))
    }
    if (!col.fields.getByName('tax_meta')) {
      col.fields.add(new NumberField({ name: 'tax_meta', min: 0 }))
    }
    if (!col.fields.getByName('sales_tax')) {
      col.fields.add(new NumberField({ name: 'sales_tax', min: 0 }))
    }
    app.save(col)
  },
)
