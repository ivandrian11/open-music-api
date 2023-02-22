/* mengimpor dotenv dan menjalankan konfigurasinya */
require('dotenv').config()

const Hapi = require('@hapi/hapi')
const Jwt = require('@hapi/jwt')
const Inert = require('@hapi/inert')
const path = require('path')

// Albums
const albums = require('./api/albums')
const AlbumsService = require('./services/postgres/AlbumsService')
const AlbumsValidator = require('./validator/album')

// Songs
const songs = require('./api/songs')
const SongsService = require('./services/postgres/SongsService')
const SongValidator = require('./validator/song')
const ClientError = require('./exceptions/ClientError')

// Users
const users = require('./api/users')
const UsersService = require('./services/postgres/UsersService')
const UsersValidator = require('./validator/users')

// Authentications
const authentications = require('./api/authentications')
const AuthenticationsService = require('./services/postgres/AuthenticationsService')
const TokenManager = require('./tokenize/TokenManager')
const AuthenticationsValidator = require('./validator/authentications')

// Playlists
const playlists = require('./api/playlists')
const PlaylistsService = require('./services/postgres/PlaylistsService')
const PlaylistsValidator = require('./validator/playlists')

// Collaborations
const collaborations = require('./api/collaborations')
const CollaborationsService = require('./services/postgres/CollaborationsService')
const CollaborationsValidator = require('./validator/collaborations')

// Exports
const _exports = require('./api/exports')
const ProducerService = require('./services/rabbitmq/ProducerService')
const ExportsValidator = require('./validator/exports')

// Uploads
const StorageService = require('./services/storage/StorageService')
const UploadsValidator = require('./validator/uploads')

// Cache
const CacheService = require('./services/redis/CacheService')
const config = require('./utils/config')

const init = async () => {
  const cacheService = new CacheService()
  const albumsService = new AlbumsService(cacheService)
  const songsService = new SongsService()
  const usersService = new UsersService()
  const authenticationsService = new AuthenticationsService()
  const collaborationsService = new CollaborationsService()
  const playlistsService = new PlaylistsService(
    collaborationsService,
    cacheService
  )
  const storageService = new StorageService(
    path.resolve(__dirname, 'api/albums/file/images')
  )

  const server = Hapi.server({
    port: config.app.port,
    host: config.app.host,
    routes: {
      cors: {
        origin: ['*']
      }
    }
  })

  // registrasi plugin eksternal
  await server.register([
    {
      plugin: Jwt
    },
    {
      plugin: Inert
    }
  ])

  // mendefinisikan strategy autentikasi jwt
  server.auth.strategy('openmusic_jwt', 'jwt', {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE
    },
    validate: artifacts => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id
      }
    })
  })

  await server.register([
    {
      plugin: albums,
      options: {
        service: albumsService,
        validator: AlbumsValidator,
        storageService,
        uploadValidator: UploadsValidator
      }
    },
    {
      plugin: songs,
      options: {
        service: songsService,
        validator: SongValidator
      }
    },
    {
      plugin: users,
      options: {
        service: usersService,
        validator: UsersValidator
      }
    },
    {
      plugin: authentications,
      options: {
        authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator
      }
    },
    {
      plugin: playlists,
      options: {
        service: playlistsService,
        collaborationsService,
        songsService,
        validator: PlaylistsValidator
      }
    },
    {
      plugin: collaborations,
      options: {
        collaborationsService,
        playlistsService,
        usersService,
        validator: CollaborationsValidator
      }
    },
    {
      plugin: _exports,
      options: {
        service: ProducerService,
        validator: ExportsValidator,
        playlistsService
      }
    }
  ])

  server.ext('onPreResponse', (request, h) => {
    // mendapatkan konteks response dari request
    const { response } = request

    if (response instanceof Error) {
      // penanganan client error secara internal.
      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: 'fail',
          message: response.message
        })
        newResponse.code(response.statusCode)
        return newResponse
      }
      // mempertahankan penanganan client error oleh hapi secara native, seperti 404, etc.
      if (!response.isServer) {
        return h.continue
      }
      // penanganan server error sesuai kebutuhan
      const newResponse = h.response({
        status: 'error',
        message: 'terjadi kegagalan pada server kami'
      })
      newResponse.code(500)
      return newResponse
    }
    // jika bukan error, lanjutkan dengan response sebelumnya (tanpa terintervensi)
    return h.continue
  })

  await server.start()
  console.log(`Server berjalan pada ${server.info.uri}`)
}

init()