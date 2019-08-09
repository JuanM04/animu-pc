const { ipcRenderer } = require('electron')

let app = new Vue({
  el: '#app',
  data: {
    animeInfo: {
      id: 0,
      slug: '',
      name: '',
    },
    episodes: [],
    playing: 0,
    lastSeen: 0
  },
  methods: {
    playEpisode: function(n) {
      this.playing = n
      const { id } = this.episodes.find(episode => episode.n === n)
      ipcRenderer.send('playEpisode', `https://animeflv.net/ver/${id}/${this.animeInfo.slug}-${n}`, n)
    },
    close: function() {
      ipcRenderer.send('closePlayer', `https://animeflv.net/anime/${this.animeInfo.id}/${this.animeInfo.slug}`)
    }
  },
  filters: {
    idToPoster: id => `https://animeflv.net/uploads/animes/covers/${id}.jpg`,
    episodeNToThumbnail: n => `https://cdn.animeflv.net/screenshots/${app.animeInfo.id}/${n}/th_3.jpg`
  }
})



ipcRenderer.on('loadAnime', (e, data) => {
  app.animeInfo = data.animeInfo
  app.episodes = data.episodes.reverse()
  app.lastSeen = data.lastSeen

  app.playEpisode(app.lastSeen + 1)
})



// Blue bar to drag the window
document.documentElement.addEventListener('mouseenter', () => { dragger.style.visibility = 'visible' })
document.documentElement.addEventListener('mouseleave', () => { dragger.style.visibility = 'hidden' })