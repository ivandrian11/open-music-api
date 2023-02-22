const { Pool } = require('pg')
const InvariantError = require('../../exceptions/InvariantError')
const NotFoundError = require('../../exceptions/NotFoundError')
const { nanoid } = require('nanoid')

class SongService {
  constructor () {
    this._pool = new Pool()
  }

  async addSong ({ title, year, genre, performer, duration, albumId }) {
    const id = `song-${nanoid(16)}`
    const createdAt = new Date().toISOString()

    const query = {
      text: 'INSERT INTO songs VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING id',
      values: [id, title, year, performer, genre, duration, albumId, createdAt]
    }

    const { rows } = await this._pool.query(query)

    if (!rows[0].id) {
      throw new InvariantError('Data lagu gagal ditambahkan')
    }
    return rows[0].id
  }

  async getSongs (title = '', performer = '') {
    const query = {
      text: 'SELECT id, title, performer FROM songs WHERE title ILIKE $1 and performer ILIKE $2',
      values: [`%${title}%`, `%${performer}%`]
    }

    const { rows } = await this._pool.query(query)

    return rows
  }

  async getSongById (id) {
    const query = {
      text: 'SELECT * FROM songs WHERE id=$1',
      values: [id]
    }

    const { rows, rowCount } = await this._pool.query(query)

    if (!rowCount) {
      throw new NotFoundError('Lagu tidak ditemukan')
    }

    return rows[0]
  }

  async editSongById (id, { title, year, genre, performer, duration }) {
    const updatedAt = new Date().toISOString()

    const query = {
      text: 'UPDATE songs SET title=$2, year=$3, performer=$4, genre=$5, duration=$6, updated_at=$7 WHERE id=$1 RETURNING id',
      values: [id, title, year, performer, genre, duration, updatedAt]
    }

    const { rowCount } = await this._pool.query(query)

    if (!rowCount) {
      throw new NotFoundError('Gagal memperbarui song. id tidak ditemukan')
    }
  }

  async deleteSongById (id) {
    const query = {
      text: 'DELETE FROM songs WHERE id = $1 RETURNING id',
      values: [id]
    }

    const { rowCount } = await this._pool.query(query)

    if (!rowCount) {
      throw new NotFoundError('Song gagal dihapus. id tidak ditemukan')
    }
  }
}

module.exports = SongService
