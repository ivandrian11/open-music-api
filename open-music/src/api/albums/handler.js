const autoBind = require('auto-bind')
const config = require('../../utils/config')

class AlbumHandler {
  constructor (service, validator, storageService, uploadValidator) {
    this._service = service
    this._validator = validator
    this._storageService = storageService
    this._uploadValidator = uploadValidator

    autoBind(this)
  }

  async postAlbumHandler (request, h) {
    this._validator.validateAlbumPayload(request.payload)

    const albumId = await this._service.addAlbum(request.payload)

    const response = h.response({
      status: 'success',
      message: 'Album berhasil ditambahkan',
      data: {
        albumId
      }
    })

    response.code(201)
    return response
  }

  async getAlbumsHandler () {
    const albums = await this._service.getAlbums()
    return {
      status: 'success',
      data: {
        albums
      }
    }
  }

  async getAlbumByIdHandler (request, h) {
    const { id } = request.params

    const album = await this._service.getAlbumById(id)
    const songs = await this._service.getSongsByAlbumId(id)

    album.coverUrl = album.cover
    delete album.cover
    album.songs = songs

    return {
      status: 'success',
      data: {
        album
      }
    }
  }

  async putAlbumByIdHandler (request, h) {
    this._validator.validateAlbumPayload(request.payload)

    const { id } = request.params

    await this._service.editAlbumById(id, request.payload)

    return {
      status: 'success',
      message: 'Album berhasil diperbarui'
    }
  }

  async deleteAlbumByIdHandler (request, h) {
    const { id } = request.params

    await this._service.deleteAlbumById(id)

    return {
      status: 'success',
      message: 'Album berhasil dihapus'
    }
  }

  async postAlbumCoverHandler (request, h) {
    const { cover } = request.payload
    this._uploadValidator.validateImageHeaders(cover.hapi.headers)

    const filename = await this._storageService.writeFile(cover, cover.hapi)
    const { id } = request.params
    const path = `http://${config.app.host}:${config.app.port}/albums/images/${filename}`
    await this._service.insertAlbumCover(id, path)

    const response = h.response({
      status: 'success',
      message: 'Sampul berhasil diunggah'
    })
    response.code(201)
    return response
  }

  async postAlbumLikeHandler (request, h) {
    const { id: albumId } = request.params
    const { id: userId } = request.auth.credentials

    await this._service.getAlbumById(albumId)
    await this._service.setLikeAlbum(albumId, userId)

    const response = h.response({
      status: 'success',
      message: 'Berhasil melakukan aksi'
    })
    response.code(201)
    return response
  }

  async getAlbumLikeHandler (request, h) {
    const { id } = request.params

    const { likes, isCache } = await this._service.getLikeAlbum(id)

    const response = h.response({
      status: 'success',
      data: {
        likes: likes.length
      }
    })

    if (isCache) {
      response.header('X-Data-Source', 'cache')
    }
    return response
  }
}

module.exports = AlbumHandler
