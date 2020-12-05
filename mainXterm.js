import Terminal from 'xterm.js'
//import 'xterm/lib/addons/fit/fit'
//import 'xterm.css'

//import './app.css'

document.addEventListener('DOMContentLoaded', () => {
  const unloadCallback = function (event) {
    const message = 'Close terminal? this will also terminate the command.'

    event.returnValue = message

    return message
  }

  const createTerm = (socket) => {
    let resizedFinished = null
    const terminalContainer = document.querySelector('#terminal')
    const term = new Terminal({
      cursorBlink: true, // 光标闪烁
      scrollback: 1000, // 终端中滚动保留的行数
      tabStopWidth: 8, //
    })

    term.on('resize', (size) => {
      console.log('resize', size)
      const data = {
        cols: size.cols,
        rows: size.rows,
      }

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          data,
          type: 'size'
        }))
      }
    })

    term.on('data', (data) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          data,
          type: 'data',
        }))
      }
    })

    term.on('open', () => {
      // https://stackoverflow.com/a/27923937/1727928
      window.addEventListener('resize', () => {
        clearTimeout(resizedFinished)

        resizedFinished = setTimeout(() => {
          term.fit()
        }, 250)
      })

      window.addEventListener('beforeunload', unloadCallback)

      term.fit()
    })

    // 移除子元素
    while (terminalContainer.firstChild) {
      terminalContainer.removeChild(terminalContainer.firstChild)
    }

    term.open(terminalContainer, true)

    return term
  }

  const openWs = (options) => {
    let autoReconnect = -1
    const httpsEnabled = window.location.protocol === 'https:'
    const url = (httpsEnabled ? 'wss://' : 'ws://') + window.location.host + '/ws'
    const protocols = ['tty']
    //const socket = new WebSocket(url, protocols)
    const socket = new WebSocket(url)
    const term = createTerm(socket) // term.destroy()

    socket.onopen = (event) => {
      console.log('Websocket connection opened')

      term.fit()

      // send ssh config
      socket.send(JSON.stringify({
        data: {
          hostname: options.host,
          port: parseInt(options.port, 10),
        },
        type: 'config',
      }))

      term.fit()
    }

    if (typeof options.host === 'undefined') {
      term.write(`\r\n\r\n\x1b[31m============== Error: 请传递正确的参数 ============\x1b[0m\r\n\r\n`)
      return false
    }

    if ((isNaN(Number(options.port))) ||
      (/^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/.test(options.host) === false)
    ) {
      term.write(`\r\n\r\n\x1b[31m============== Error: 请提供格式正确的参数 ============\x1b[0m\r\n\r\n`)
      return false
    }

    socket.onerror = (error) => {
      term.write(`\r\n\r\n\x1b[31m============== Error: ${JSON.stringify(error)} ============\x1b[0m\r\n\r\n`)
    }

    socket.onclose = (event) => {
      console.log(`Websocket connection closed with code: ${event.code}`)

      if (term) {
        // \033 ->         // \033 -> \x1b
        // term.write('\r\n\r\nm============== connect closed! ============\r\n\r\n')
        term.write(`\r\n\r\n\x1b[31m============== connect closed! ============\x1b[0m\r\n\r\n`)
        term.off('data')
        term.off('resize')
      }

      window.removeEventListener('beforeunload', unloadCallback)

      // 1000: CLOSE_NORMAL
      if (event.code !== 1000 && autoReconnect > 0) {
        setTimeout(openWs, autoReconnect * 1000)
      }
    }

    socket.onmessage = (event) => {
      console.log('onmessage', event)
      const message = event.data.toString()

      term.write(message)
    }
  }
  // const querystringObj = window.location.search ? parse(window.location.search.replace('?', '')) : {};
  const options = {
    host: '192.168.1.119',
    port: 22,
  }

  openWs(options)
})
