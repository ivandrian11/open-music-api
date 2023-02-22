const { AlbumPlayloadSchema } = require('./schema')
const InvariantError = require('../../exceptions/InvariantError')

const AlbumValidator = {
  validateAlbumPayload: payload => {
    const validationResult = AlbumPlayloadSchema.validate(payload)
    if (validationResult.error) {
      throw new InvariantError(validationResult.error.message)
    }
  }
}

module.exports = AlbumValidator
