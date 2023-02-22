const { Pool } = require('pg')
const NotFoundError = require('../../exceptions/NotFoundError')
const InvariantError = require('../../exceptions/InvariantError')
const { nanoid } = require('nanoid')

class AlbumService {
  constructor (cacheService) {
    this._pool = new Pool()
    this._cacheService = cacheService
  }

  async addAlbum ({ name, year }) {
    const id = `album-${nanoid(16)}`
    const createdAt = new Date().toISOString()

    const query = {
      text: 'INSERT INTO albums VALUES($1, $2, $3, $4, $4) RETURNING id',
      values: [id, name, year, createdAt]
    }

    const { rows } = await this._pool.query(query)

    if (!rows[0].id) {
      throw new InvariantError('Data album gagal ditambahkan')
    }

    return rows[0].id
  }

  async getAlbums () {
    const { rows } = await this._pool.query('SELECT * FROM albums')

    return rows
  }

  async getAlbumById (id) {
    const query = {
      text: 'SELECT * FROM albums WHERE id=$1',
      values: [id]
    }

    const { rows, rowCount } = await this._pool.query(query)

    if (!rowCount) {
      throw new NotFoundError('Album tidak ditemukan')
    }

    return rows[0]
  }

  async getSongsByAlbumId (id) {
    const query = {
      text: 'SELECT id, title, performer FROM songs WHERE "albumId" = $1',
      values: [id]
    }

    const { rows } = await this._pool.query(query)

    return rows
  }

  async editAlbumById (id, { name, year }) {
    const updatedAt = new Date().toISOString()
    const query = {
      text: 'UPDATE albums SET name=$2, year=$3, updated_at=$4 WHERE id= $1 RETURNING id',
      values: [id, name, year, updatedAt]
    }

    const { rowCount } = await this._pool.query(query)

    if (!rowCount) {
      throw new NotFoundError('Gagal memperbarui album. id tidak ditemukan')
    }
  }

  async deleteAlbumById (id) {
    const query = {
      text: 'DELETE FROM albums WHERE id = $1 RETURNING id',
      values: [id]
    }

    const { rowCount } = await this._pool.query(query)

    if (!rowCount) {
      throw new NotFoundError('Album gagal dihapus. id tidak ditemukan')
    }
  }

  async insertAlbumCover (albumId, cover) {
    const query = {
      text: 'UPDATE albums SET cover = $2 WHERE id = $1',
      values: [albumId, cover]
    }

    const { rowCount } = await this._pool.query(query)

    if (!rowCount) {
      throw new InvariantError('Cover gagal ditambahkan')
    }
  }

  async setLikeAlbum (albumId, userId) {
    let query = {
      text: 'SELECT * FROM user_album_likes WHERE album_id = $1 AND user_id = $2',
      values: [albumId, userId]
    }

    const { rowCount } = await this._pool.query(query)
    if (!rowCount) {
      // like album
      const id = `likes-${nanoid(16)}`

      query = {
        text: 'INSERT INTO user_album_likes (id, user_id, album_id) VALUES ($1, $2, $3)',
        values: [id, userId, albumId]
      }

      const { rowCount } = await this._pool.query(query)

      if (!rowCount) {
        throw new InvariantError('Like gagal ditambahkan')
      }
    } else {
      // dislike album
      query = {
        text: 'DELETE FROM user_album_likes WHERE album_id = $1 AND user_id = $2',
        values: [albumId, userId]
      }

      const { rowCount } = await this._pool.query(query)

      if (!rowCount) {
        throw new InvariantError('Like gagal dihapus')
      }
    }
    await this._cacheService.delete(`likes:${albumId}`)
  }

  async getLikeAlbum (albumId) {
    try {
      const result = await this._cacheService.get(`likes:${albumId}`)
      return { likes: JSON.parse(result), isCache: true }
    } catch (error) {
      const query = {
        text: 'SELECT user_id FROM user_album_likes WHERE album_id = $1',
        values: [albumId]
      }

      const { rows } = await this._pool.query(query)

      await this._cacheService.set(`likes:${albumId}`, JSON.stringify(rows))
      return { likes: rows }
    }
  }
}

module.exports = AlbumService
