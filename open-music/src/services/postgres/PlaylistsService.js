const { Pool } = require('pg')
const { nanoid } = require('nanoid')
const InvariantError = require('../../exceptions/InvariantError')
const NotFoundError = require('../../exceptions/NotFoundError')
const AuthorizationError = require('../../exceptions/AuthorizationError')

class PlaylistsService {
  constructor (collaborationsService, cacheService) {
    this._pool = new Pool()
    this._collaborationsService = collaborationsService
    this._cacheService = cacheService
  }

  async addPlaylist ({ name, owner }) {
    const id = `playlist-${nanoid(16)}`

    const query = {
      text: 'INSERT INTO playlists (id, name, owner) VALUES ($1, $2, $3) RETURNING id',
      values: [id, name, owner]
    }

    const { rows } = await this._pool.query(query)

    if (!rows[0].id) {
      throw new InvariantError('Playlist gagal dibuat')
    }

    await this._cacheService.delete(`playlist:${id}`)
    return rows[0].id
  }

  async getPlaylists (owner) {
    const query = {
      text: `SELECT p.id, p.name, u.username FROM playlists p
      LEFT JOIN collaborations c ON p.id = c.playlist_id
      LEFT JOIN users u ON p.owner = u.id
      WHERE p.owner = $1 OR c.user_id = $1`,
      values: [owner]
    }

    const { rows } = await this._pool.query(query)

    return rows
  }

  async deletePlaylist (id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [id]
    }

    const { rowCount } = await this._pool.query(query)

    if (!rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan')
    }

    await this._cacheService.delete(`playlist:${id}`)
  }

  async addSongToPlaylist (playlistId, songId) {
    const id = `ps-${nanoid(16)}`

    const query = {
      text: 'INSERT INTO playlist_songs (id, playlist_id, song_id) VALUES ($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId]
    }

    const { rows } = await this._pool.query(query)

    if (!rows[0].id) {
      throw new InvariantError('Lagu gagal ditambah di playlist')
    }

    await this._cacheService.delete(`playlist-songs:${playlistId}`)
  }

  async getPlaylistDetails (playlistId) {
    try {
      const result = await this._cacheService.get(`playlist:${playlistId}`)
      return JSON.parse(result)
    } catch (error) {
      const query = {
        text: 'SELECT playlists.id, playlists.name, users.username FROM playlists LEFT JOIN users ON playlists.owner = users.id WHERE playlists.id = $1',
        values: [playlistId]
      }

      const { rows } = await this._pool.query(query)

      if (!rows.length) {
        throw new NotFoundError('Playlist tidak ditemukan')
      }

      await this._cacheService.set(
        `playlist:${playlistId}`,
        JSON.stringify(rows[0])
      )
      return rows[0]
    }
  }

  async getPlaylistSongs (playlistId) {
    try {
      const result = await this._cacheService.get(
        `playlist-songs:${playlistId}`
      )
      return JSON.parse(result)
    } catch (error) {
      const query = {
        text: 'SELECT songs.id, songs.title, songs.performer FROM songs LEFT JOIN playlist_songs ON playlist_songs.song_id = songs.id WHERE playlist_songs.playlist_id = $1',
        values: [playlistId]
      }

      const { rows } = await this._pool.query(query)

      await this._cacheService.set(
        `playlist-songs:${playlistId}`,
        JSON.stringify(rows[0])
      )
      return rows
    }
  }

  async deleteSongFromPlaylist (playlistId, songId) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2',
      values: [playlistId, songId]
    }

    const { rowCount } = await this._pool.query(query)
    if (!rowCount) {
      throw new NotFoundError('Lagu tidak ditemukan')
    }

    await this._cacheService.delete(`playlist-songs:${playlistId}`)
  }

  async verifyPlaylistOwner (id, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id]
    }

    const { rows, rowCount } = await this._pool.query(query)

    if (!rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan')
    }

    const playlist = rows[0]
    if (playlist.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini')
    }
  }

  async verifyPlaylistsAccess (id, userId) {
    try {
      await this.verifyPlaylistOwner(id, userId)
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }

      try {
        await this._collaborationsService.verifyCollaborator(id, userId)
      } catch {
        throw error
      }
    }
  }

  async addPlaylistActivities (playlistId, songId, userId, action) {
    const id = `psa-${nanoid(16)}`
    const time = new Date()

    const query = {
      text: 'INSERT INTO playlist_song_activities (id, playlist_id, song_id, user_id, action, time) VALUES ($1, $2, $3, $4, $5, $6)',
      values: [id, playlistId, songId, userId, action, time]
    }

    await this._pool.query(query)
    await this._cacheService.delete(`activities:${playlistId}`)
  }

  async getPlaylistActivities (playlistId) {
    try {
      const result = await this._cacheService.get(`activities:${playlistId}`)
      return JSON.parse(result)
    } catch (error) {
      const query = {
        text: `SELECT u.username, s.title, psa.action, psa.time FROM playlist_song_activities psa
      JOIN users u ON psa.user_id = u.id
      JOIN songs s ON psa.song_id = s.id
      WHERE psa.playlist_id = $1
      ORDER BY psa.time ASC`,
        values: [playlistId]
      }

      const { rows } = await this._pool.query(query)

      await this._cacheService.set(
        `activities:${playlistId}`,
        JSON.stringify(rows)
      )
      return rows
    }
  }
}

module.exports = PlaylistsService
