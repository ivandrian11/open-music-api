const autoBind = require('auto-bind')

class ExportsHandler {
  constructor (service, playlistsService, validator) {
    this._service = service
    this._validator = validator
    this._playlistsService = playlistsService

    autoBind(this)
  }

  async postExportPlaylistsHandler (request, h) {
    this._validator.validateExportPlaylistsPayload(request.payload)

    const userId = request.auth.credentials.id
    const playlistId = request.params.playlistid

    await this._playlistsService.getPlaylistDetails(playlistId)
    await this._playlistsService.verifyPlaylistOwner(playlistId, userId)

    const message = {
      playlistId,
      targetEmail: request.payload.targetEmail
    }

    await this._service.sendMessage('export:playlists', JSON.stringify(message))

    const response = h.response({
      status: 'success',
      message: 'Permintaan Anda dalam antrean'
    })
    response.code(201)
    return response
  }
}

module.exports = ExportsHandler
