# Description:
#   Help keep track of whats being ordered for lunch
#
# Dependencies:
#    "cron": "",
#    "time": ""
#
# Configuration:
#   HUBOT_LUNCHBOT_ROOM
#   HUBOT_LUNCHBOT_NOTIFY_AT
#   HUBOT_LUNCHBOT_CLEAR_AT
#   TZ # eg. "America/Los_Angeles"
#
# Commands:
#   hubot I want <food> - adds <food> to the list of items to be ordered
#   hubot remove my order <food> - just removes the users lunch order
#   hubot lunch orders - list all the items in the current lunch order
#   hubot cancel all orders - clears out list of items to be ordered
#   hubot who should <order|pickup|get> lunch? - help choose who is responsible for lunch
#   hubot lunch help - display help message
# Notes:
#   nom nom nom
#
# Author:
#   @jpsilvashy
#

##
# What room do you want to post the lunch messages in?
ROOM = process.env.HUBOT_LUNCHBOT_ROOM

##
# Explain how to use the lunch bot
MESSAGE = """
Let's order lunch!!!! You can say:
bot I want the BLT Sandwich - adds "BLT Sandwich" to the list of items to be ordered
bot remove my order - removes your order
bot cancel all orders - cancels all the orders
bot lunch orders - lists all orders
bot lunch help - displays this help message
"""

module.exports = (robot) ->

  if not robot.brain.data.lunch?
    robot.brain.data.lunch = {}

  ##
  # Define the lunch functions
  lunch =
    get: ->
      Object.keys(robot.brain.data.lunch)

    add: (user, item) ->
      # robot.brain.data.lunch = {}
      robot.brain.data.lunch[user] = item

    remove: (user) ->
      delete robot.brain.data.lunch[user]

    clear: ->
      robot.brain.data.lunch = {}
      robot.messageRoom ROOM, "lunch order cleared..."

    notify: ->
      robot.messageRoom ROOM, MESSAGE

  ##
  # List out all the orders
  robot.respond /lunch orders$/i, (msg) ->
    orders = lunch.get().map (user) -> "#{user}: #{robot.brain.data.lunch[user]}"
    msg.send orders.join("\n") || "No items in the lunch list."

  ##
  # Save what a person wants to the lunch order
  robot.respond /i want (.*)/i, (msg) ->
    item = msg.match[1].trim()
    lunch.add msg.message.user.name, item
    msg.send "ok, added #{item} to your order."

  ##
  # Remove the persons items from the lunch order
  robot.respond /remove my order/i, (msg) ->
    lunch.remove msg.message.user.name
    msg.send "ok, I removed your order."

  ##
  # Cancel the entire order and remove all the items
  robot.respond /cancel all orders/i, (msg) ->
    delete robot.brain.data.lunch
    lunch.clear()

  ##
  # Display usage details
  robot.respond /lunch help/i, (msg) ->
    msg.send MESSAGE

  ##
  # Just print out the details on how the lunch bot is configured
  robot.respond /lunch config/i, (msg) ->
    msg.send "ROOM: #{ROOM}"

