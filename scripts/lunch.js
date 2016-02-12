'use strict'
const cheerio = require('cheerio')

const ROOM = process.env.HUBOT_LUNCHBOT_ROOM
const MESSAGE = 'Let\'s order lunch!!! You can say:\nbot I want A - adds "A" to the list of items to be ordered\nbot remove my order - removes your order\nbot cancel all orders - cancels all the orders\nbot lunch orders - lists all orders\nbot lunch options - lists today\'s options from lunch.hr\nbot lunch help - displays this help message'
const TIMEZONE = process.env.TZ
const NOTIFY_AT = process.env.HUBOT_LUNCHBOT_NOTIFY_AT || '0 0 11 * * *'
const CLEAR_AT = process.env.HUBOT_LUNCHBOT_CLEAR_AT || '0 0 0 * * *'

module.exports = robot => {
  if (robot.brain.data.lunch == null) {
    robot.brain.data.lunch = {}
  }
  const lunch = {
    get: function () {
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
    }
  }
  const schedule = {
    notify: function (time) {},
    clear: function (time) {}
  }
  schedule.notify(NOTIFY_AT)
  schedule.clear(CLEAR_AT)
  robot.respond(/lunch options/i, msg => {
    return robot.http('http://www.lunch.hr/').get()((err, res, body) => {
      if (err) {
        throw err
      }
      let $ = cheerio.load(body)
      let options = []
      let message = ''
      let items = $('#slider2 li')
      items = Object.keys(items).map(key => {
        if (items[key]) {
          return items[key]
        }
      })
      items.forEach((item, i) => {
        let letter = $(item).find($('.slovo')).text()
        let icon = ':lunch_' + letter.toLowerCase() + ':'
        let title = $(item).find($('.tooltip')).attr('title')
        if (letter && title) {
          options[i] = {
            icon: `${icon}`,
            text: `${letter}: ${title}`
          }
        }
      })

      options.forEach(op => {
        message += '\n' + op.icon + '\n' + op.text + '\n'
      })
      return msg.send(message)
    })
  })

  robot.respond(/lunch orders$/i, msg => {
    let displayOrders = {}
    let orders = []
    lunch.get().forEach(user => {
      const letter = robot.brain.data.lunch[user]
      if (!displayOrders[letter]) {
        displayOrders[letter] = {
          number: 1,
          users: [user]
        }
      } else {
        displayOrders[letter].number++
        displayOrders[letter].users.push(user)
      }
    })

    for (let prop in displayOrders) {
      if (displayOrders.hasOwnProperty(prop)) {
        const val = displayOrders[prop]
        const message = `${prop}: ${val.number} (${val.users.join(',')})`
        orders.push(message)
      }
    }
    return msg.send(orders.join('\n') || 'No items in the lunch list.')
  })
  robot.respond(/i want (.*)/i, msg => {
    const item = msg.match[1].trim()
    lunch.add(msg.message.user.name, item)
    return msg.send(`ok, added ${item} to your order.`)
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
  return robot.respond(/lunch config/i, function (msg) {
    return msg.send(`ROOM: ${ROOM} \nTIMEZONE: ${TIMEZONE} \nNOTIFY_AT: ${NOTIFY_AT} \nCLEAR_AT: ${CLEAR_AT} \n`)
  })
}
