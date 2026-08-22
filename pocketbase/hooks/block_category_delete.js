/// <reference path="../pb_data/pb_hooks.d.ts" />
// Blocks deletion of a fixed_expense_categories record that still has
// linked fixed_expenses. Fires for both API DELETE and internal $app.delete().
onRecordDelete((e) => {
  if (e.record.collectionName !== 'fixed_expense_categories') {
    e.next()
    return
  }

  const categoryId = e.record.id

  try {
    const linked = $app.findRecordsByFilter(
      'fixed_expenses',
      `category = '${categoryId}'`,
      '',
      1,
      0,
    )
    if (linked && linked.length > 0) {
      throw new BadRequestError('Esta categoria possui gastos vinculados e não pode ser excluída.')
    }
  } catch (err) {
    // Re-throw validation/bad-request errors so the client sees them.
    if (err instanceof BadRequestError) {
      throw err
    }
    // On other errors (e.g. collection not present yet), allow deletion to proceed.
  }

  e.next()
})
