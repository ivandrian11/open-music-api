const { Pool } = require('pg')

class PlaylistsService {
  constructor () {
    this._pool = new Pool()
  }

  async getPlaylistDetails (playlistId) {
    const query = {
      text: 'SELECT playlists.id, playlists.name FROM playlists WHERE playlists.id = $1',
      values: [playlistId]
    }

    const { rows } = await this._pool.query(query)
    return rows[0]
  }

  async getPlaylistSongs (playlistId) {
    const query = {
      text: 'SELECT songs.id, songs.title, songs.performer FROM songs LEFT JOIN playlist_songs ON playlist_songs.song_id = songs.id WHERE playlist_songs.playlist_id = $1',
      values: [playlistId]
    }

    const { rows } = await this._pool.query(query)
    return rows
  }
}

module.exports = PlaylistsService
