class Listener {
  constructor (playlistsService, mailSender) {
    this.playlistsService = playlistsService
    this._mailSender = mailSender

    this.listen = this.listen.bind(this)
  }

  async listen (message) {
    try {
      const { playlistId, targetEmail } = JSON.parse(message.content.toString())

      const playlist = await this.playlistsService.getPlaylistDetails(
        playlistId
      )
      const songs = await this.playlistsService.getPlaylistSongs(playlistId)
      playlist.songs = songs

      const result = await this._mailSender.sendEmail(
        targetEmail,
        JSON.stringify({ playlist })
      )
      console.log(result)
    } catch (error) {
      console.error(error)
    }
  }
}

module.exports = Listener
