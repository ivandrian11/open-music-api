const { Pool } = require('pg')
const { nanoid } = require('nanoid')
const InvariantError = require('../../exceptions/InvariantError')
const AuthorizationError = require('../../exceptions/AuthorizationError')

class CollaborationsService {
  constructor () {
    this._pool = new Pool()
  }

  async addCollaboration (playlistId, userId) {
    const id = `collab-${nanoid(16)}`

    const query = {
      text: 'INSERT INTO collaborations (id, playlist_id, user_id) VALUES ($1, $2, $3) RETURNING id',
      values: [id, playlistId, userId]
    }

    const { rows, rowCount } = await this._pool.query(query)

    if (!rowCount) {
      throw new InvariantError('Kolaborasi gagal ditambahkan')
    }
    return rows[0].id
  }

  async deleteCollaboration (playlistId, userId) {
    const query = {
      text: 'DELETE FROM collaborations WHERE playlist_id = $1 AND user_id = $2 RETURNING id',
      values: [playlistId, userId]
    }

    const { rowCount } = await this._pool.query(query)

    if (!rowCount) {
      throw new InvariantError('Kolaborasi tidak ditemukan')
    }
  }

  async verifyCollaborator (playlistId, userId) {
    const query = {
      text: 'SELECT * FROM collaborations WHERE playlist_id = $1 AND user_id = $2',
      values: [playlistId, userId]
    }

    const { rowCount } = await this._pool.query(query)

    if (!rowCount) {
      throw new AuthorizationError('Anda tidak berhak mengakses playlist ini')
    }
  }
}

module.exports = CollaborationsService
