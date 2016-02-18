'use strict'
const cheerio = require('cheerio')
const rp = require('request-promise')

const ROOM = process.env.HUBOT_LUNCHBOT_ROOM
const MESSAGE = 'Let\'s order lunch!!! You can say:\nbot I want A - adds "A" to the list of items to be ordered\nbot remove my order - removes your order\nbot cancel all orders - cancels all the orders\nbot lunch orders - lists all orders\nbot lunch options - lists today\'s options from lunch.hr\nbot lunch help - displays this help message'
const TIMEZONE = process.env.TZ
const NOTIFY_AT = process.env.HUBOT_LUNCHBOT_NOTIFY_AT || '0 0 11 * * *'
const CLEAR_AT = process.env.HUBOT_LUNCHBOT_CLEAR_AT || '0 0 0 * * *'

const requestOptions = {
  uri: 'http://www.lunch.hr/',
  transform: body => {
    return cheerio.load(body)
  }
}

module.exports = robot => {
  if (robot.brain.data.lunch == null) {
    robot.brain.data.lunch = {}
  }
  const lunch = {
    get: () => {
      return Object.keys(robot.brain.data.lunch)
    },
    add: (user, item) => {
      robot.brain.data.lunch[user] = item
      return robot.brain.data.lunch[user]
    },
    remove: user => {
      return delete robot.brain.data.lunch[user]
    },
    clear: () => {
      robot.brain.data.lunch = {}
      return robot.messageRoom(ROOM, 'lunch order cleared...')
    },
    notify: () => {
      return robot.messageRoom(ROOM, MESSAGE)
    },
    getData: () => {
      return rp(requestOptions)
    },
    isAvailable: (letter, $) => {
      let itemMapping = { 'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5 }
      let itemNumber = itemMapping[letter.toLowerCase()]

      return $('#dostupnost' + itemNumber).text() === 'dostupno'
    }
  }
  const schedule = {
    notify: time => {},
    clear: time => {}
  }
  schedule.notify(NOTIFY_AT)
  schedule.clear(CLEAR_AT)

  robot.respond(/(lunch options)/i, msg => {
    lunch.getData().then($ => {
      let options = []
      let message = ''
      let items = $('#slider2 li')
      items = Object.keys(items).map(key => {
        if (items[key]) {
          return items[key]
        }
      })
      items.forEach(item => {
        const letter = $(item).find($('.slovo')).text()
        const icon = ':lunch_' + letter.toLowerCase() + ':'
        const title = $(item).find($('.tooltip')).attr('title')
        const available = lunch.isAvailable(letter, $)
        if (letter && title && available) {
          options.push({
            icon: `${icon}`,
            text: `${letter}: ${title}`
          })
        }
      })

      options.forEach(op => {
        message += '\n' + op.icon + '\n' + op.text + '\n'
      })
      return msg.send(message || 'No lunch for you!')
    })
  })

  robot.respond(/lunch orders$/i, msg => {
    let displayOrders = {}
    let orders = []
    lunch.get().forEach(user => {
      const letter = robot.brain.data.lunch[user]
      if (!displayOrders[letter]) {
        displayOrders[letter] = [user]
      } else {
        displayOrders[letter].push(user)
      }
    })
    //  check if all lunches are available
    lunch.getData().then($ => {
      for (let prop in displayOrders) {
        if (displayOrders.hasOwnProperty(prop)) {
          const available = lunch.isAvailable(prop, $)
          const val = displayOrders[prop]
          let message
          if (available) {
            message = `${prop}: ${val.length} (${val.join(',')})`
          } else {
            message = `${prop}: Hey @${val.join('@ ')} unfortunately your lunch has been sold out :(`
          }
          orders.push(message)
        }
      }
      return msg.send(orders.join('\n') || 'No items in the lunch list.')
    })
  })
  robot.respond(/i want (.*)/i, msg => {
    const item = msg.match[1].trim().toUpperCase()
    lunch.getData().then($ => {
      if (lunch.isAvailable(item, $)) {
        lunch.add(msg.message.user.name, item)
        return msg.send(`ok, added ${item} to your order.`)
      } else {
        return msg.send(`sorry, ${item} is no longer available. Do you want anything else?`)
      }
    })
  })
  robot.respond(/remove my order/i, msg => {
    lunch.remove(msg.message.user.name)
    return msg.send('ok, I removed your order.')
  })
  robot.respond(/cancel all orders/i, msg => {
    delete robot.brain.data.lunch
    return lunch.clear()
  })
  robot.respond(/lunch help/i, msg => {
    return msg.send(MESSAGE)
  })
  return robot.respond(/lunch config/i, msg => {
    return msg.send(`ROOM: ${ROOM} \nTIMEZONE: ${TIMEZONE} \nNOTIFY_AT: ${NOTIFY_AT} \nCLEAR_AT: ${CLEAR_AT} \n`)
  })
}
