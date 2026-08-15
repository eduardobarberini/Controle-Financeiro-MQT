migrate(
  (app) => {
    // Rename the seed user email from Body4You to MQT Negócios Digitais.
    const oldEmail = 'eduardo@body4you.com.br'
    const newEmail = 'eduardo@mqtnegociosdigitais.com.br'

    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', oldEmail)
    } catch (_) {
      // Old email no longer present — nothing to rename.
      return
    }

    // If a record with the new email already exists, don't clobber it.
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', newEmail)
      return
    } catch (_) {
      // expected — new email not yet in use
    }

    userRecord.setEmail(newEmail)
    app.save(userRecord)
  },
  (app) => {
    const oldEmail = 'eduardo@body4you.com.br'
    const newEmail = 'eduardo@mqtnegociosdigitais.com.br'

    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', newEmail)
    } catch (_) {
      return
    }

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', oldEmail)
      return
    } catch (_) {
      // expected
    }

    userRecord.setEmail(oldEmail)
    app.save(userRecord)
  },
)
