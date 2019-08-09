const SHARED_WINDOW_PROPS = {
  height: 720,
  useContentSize: true,
  resizable: false
}
const DISCORD_CLIENT_ID = '608717645772095498'

const { app, BrowserWindow, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const Discord = require('discord-rich-presence')(DISCORD_CLIENT_ID)

const axios = require('axios')
const path = require('path')
const url = require('url')

const isAnime = url => /https:\/\/animeflv.net\/anime\/\d+\/[\w\-]+/.test(url)

let mainWindow, episodesWindow, playerWindow
let currentAnime



autoUpdater.setFeedURL(`https://animu.juanm04.com/update/${process.platform}/${app.getVersion()}`)
autoUpdater.checkForUpdatesAndNotify()



function initPlayer(data) {
  // Create playerWindow
  playerWindow = new BrowserWindow({
    ...SHARED_WINDOW_PROPS,
    width: 1280,
    frame: false,
    backgroundColor: '#000'
  })
  playerWindow.removeMenu()
  playerWindow.setClosable(false)
  
  playerWindow.webContents.on('did-finish-load', () => {
    // Create a blue bar at the top to drag the window
    playerWindow.webContents.executeJavaScript(`(function() {
      let dragger = document.createElement('div')
      dragger.style.position =        'fixed'
      dragger.style.top =             '0'
      dragger.style.left =            '0'
      dragger.style.width =           '100vw'
      dragger.style.height =          '10px'
      dragger.style.backgroundColor = '#00bcf2'
      dragger.style.zIndex =          '1000'
      dragger.style.webkitAppRegion = 'drag'
      dragger.style.visibility =      'hidden'

      document.body.appendChild(dragger)
      document.documentElement.addEventListener('mouseenter', () => { dragger.style.visibility = 'visible' })
      document.documentElement.addEventListener('mouseleave', () => { dragger.style.visibility = 'hidden' })
    })()`)
  })

  // Create episodesWindow
  episodesWindow = new BrowserWindow({
    ...SHARED_WINDOW_PROPS,
    width: 500,
    frame: false,
    backgroundColor: '#2f353a',
    webPreferences: { nodeIntegration: true }
  })
  episodesWindow.removeMenu()
  episodesWindow.setClosable(false)

  episodesWindow.loadURL(url.format({
    protocol: 'file',
    slashes: true,
    pathname: path.join(__dirname, 'player/index.html')
  }))

  episodesWindow.webContents.on('did-finish-load', () => {
    // Send Anime Data to episodesWindow
    episodesWindow.webContents.send('loadAnime', data)
  })
}





app.on('ready', () => {
  // Create mainWindow
  mainWindow = new BrowserWindow({
    width: 1280,
    ...SHARED_WINDOW_PROPS,
    webPreferences: { nodeIntegration: true }
  })
  mainWindow.removeMenu()
  mainWindow.on('closed', () => app.quit())

  mainWindow.loadURL('https://animeflv.net')

  mainWindow.webContents.on('did-navigate', (e, url) => {
    // Send Anime Data button
    if(isAnime(url)) mainWindow.webContents.executeJavaScript(`
      (function() {
        const { ipcRenderer } = require('electron')

        let playEpisodes = document.createElement('button')
        playEpisodes.appendChild(document.createTextNode('Ver'))
        playEpisodes.style.position = 'fixed'
        playEpisodes.style.right =    '20px'
        playEpisodes.style.bottom =   '20px'
        playEpisodes.style.fontSize = '40px'
        playEpisodes.style.padding =  '20px'
        playEpisodes.style.zIndex =   10000

        document.body.appendChild(playEpisodes)
        playEpisodes.addEventListener('click', () => {
          ipcRenderer.send('watchAnime', {
            animeInfo: {
              id: anime_info[0],
              slug: anime_info[2],
              name: anime_info[1]
            },
            episodes: episodes.map(episode => ({ n: episode[0], id: episode[1] })),
            lastSeen: last_seen
          })
        })
      })()
    `)
  })

  // Set Discord RPC to 'searching'
  Discord.updatePresence({
    state: 'Buscando Anime',
    startTimestamp: Date.now(),
    largeImageKey: 'searching'
  })
});


app.on('window-all-closed', () => app.quit())

// When the Anime Data button is pressed
ipcMain.on('watchAnime', (e, data) => {
  mainWindow.hide()
  initPlayer(data)

  currentAnime = {
    name: data.animeInfo.name,
    totalEpisodes: data.episodes[0].n,
    startTimestamp: Date.now()
  }
})

// When an episode is chosen
ipcMain.on('playEpisode', (e, episodeURL, episodeN) => {
  /*
    The episode HTML is fetched. Then, it searches for a variable
    'videos' and parses it to JSON. Finally, it gets the video URL
    and loads it to playerWindow
  */
  axios.get(episodeURL)
    .then(({ data }) => {
      let str = data.split('var videos = ')[1].split(';')[0]
      let sources = JSON.parse(str)

      playerWindow.loadURL(sources.SUB[0].code)

      // Set Discord RPC to 'playing'
      Discord.updatePresence({
        details: currentAnime.name,
        state: 'Viendo',
        startTimestamp: currentAnime.startTimestamp,
        largeImageKey: 'playing',
        partySize: episodeN,
        partyMax: currentAnime.totalEpisodes
      })
    })
})

ipcMain.on('closePlayer', () => {
  episodesWindow.destroy()
  episodesWindow = null
  playerWindow.destroy()
  playerWindow = null

  currentAnime = null
  mainWindow.show()
})