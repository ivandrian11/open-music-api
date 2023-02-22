exports.up = pgm => {
  pgm.createTable('playlist_songs', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true
    },
    playlist_id: {
      type: 'VARCHAR(50)',
      references: 'playlists',
      onDelete: 'cascade'
    },
    song_id: {
      type: 'VARCHAR(50)',
      references: 'songs',
      onDelete: 'cascade'
    }
  })
}

exports.down = pgm => {
  pgm.dropTable('playlist_songs')
}
