const autoBind = require('auto-bind')

class PlaylistsHandler {
  constructor (service, collaborationsService, songsService, validator) {
    this._service = service
    this._collaborationsService = collaborationsService
    this._songsService = songsService
    this._validator = validator

    autoBind(this)
  }

  async postPlaylistHandler (request, h) {
    this._validator.validatePlaylistPayload(request.payload)
    const { name } = request.payload
    const { id: credentialId } = request.auth.credentials

    const playlistId = await this._service.addPlaylist({
      name,
      owner: credentialId
    })

    const response = h.response({
      status: 'success',
      message: 'Playlist berhasil dibuat',
      data: {
        playlistId
      }
    })
    response.code(201)
    return response
  }

  async getPlaylistHandler (request) {
    const { id: credentialId } = request.auth.credentials
    const playlists = await this._service.getPlaylists(credentialId)

    return {
      status: 'success',
      data: {
        playlists
      }
    }
  }

  async deletePlaylistHandler (request, h) {
    const { id: playlistId } = request.params
    const { id: credentialId } = request.auth.credentials

    await this._service.verifyPlaylistOwner(playlistId, credentialId)
    await this._service.deletePlaylist(playlistId)

    const response = h.response({
      status: 'success',
      message: 'Playlist berhasil dihapus'
    })
    response.code(200)
    return response
  }

  // Playlists Songs
  async postPlaylistSongHandler (request, h) {
    this._validator.validatePostSongToPlaylistPayload(request.payload)
    const { id: playlistId } = request.params
    const { id: credentialId } = request.auth.credentials
    const { songId } = request.payload

    await this._songsService.getSongById(songId)
    await this._service.verifyPlaylistsAccess(playlistId, credentialId)
    await this._service.addSongToPlaylist(playlistId, songId)

    // activities
    await this._service.addPlaylistActivities(
      playlistId,
      songId,
      credentialId,
      'add'
    )

    const response = h.response({
      status: 'success',
      message: 'Lagu berhasil ditambahkan ke playlist'
    })
    response.code(201)
    return response
  }

  async getPlaylistSongHandler (request, h) {
    const { id: playlistId } = request.params
    const { id: credentialId } = request.auth.credentials

    await this._service.verifyPlaylistsAccess(playlistId, credentialId)
    const playlistDetails = await this._service.getPlaylistDetails(playlistId)
    const playlistSongs = await this._service.getPlaylistSongs(playlistId)

    return {
      status: 'success',
      data: {
        playlist: {
          id: playlistDetails.id,
          name: playlistDetails.name,
          username: playlistDetails.username,
          songs: playlistSongs
        }
      }
    }
  }

  async deletePlaylistSongHandler (request, h) {
    this._validator.validatePostSongToPlaylistPayload(request.payload)
    const { id: playlistId } = request.params
    const { id: credentialId } = request.auth.credentials
    const { songId } = request.payload

    await this._service.verifyPlaylistsAccess(playlistId, credentialId)
    await this._service.deleteSongFromPlaylist(playlistId, songId, credentialId)

    // activities
    await this._service.addPlaylistActivities(
      playlistId,
      songId,
      credentialId,
      'delete'
    )

    const response = h.response({
      status: 'success',
      message: 'Lagu berhasil dihapus dari playlist'
    })
    response.code(200)
    return response
  }

  // Get activities
  async getPlaylistActivitiesHandler (request, h) {
    const { id: playlistId } = request.params
    const { id: credentialId } = request.auth.credentials

    await this._service.verifyPlaylistsAccess(playlistId, credentialId)
    const activities = await this._service.getPlaylistActivities(playlistId)

    return {
      status: 'success',
      data: {
        playlistId,
        activities
      }
    }
  }
}

module.exports = PlaylistsHandler
