import TodaySuperPower from '../models/todaySuperPower/utils.js'
import { Config, Version } from '../components/index.js'

const todaySuperPower = new TodaySuperPower()
todaySuperPower.init()

export class example extends plugin {
  constructor () {
    super({
      name: `[${Version.pluginName}]今日超能力`,
      dsc: '今日超能力',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: '^#?(刷新)?[今昨明][日天]超能力$',
          fnc: 'todaySuperPower'
        },
        {
          reg: '^#?(不按|按下)$',
          fnc: 'action'
        },
        {
          reg: '^#?评论',
          fnc: 'review'
        },
        {
          reg: /^#?(点赞|点踩|查看|通过|删除)评论\s*[0-9]*$/,
          fnc: 'lookReview'
        }
      ]
    })
  }

  async todaySuperPower (e) {
    if (!checkEnable(e)) return false
    let msg
    if (e.msg.includes('今')) {
      if (e.msg.includes('刷新') && e.isMaster) {
        await todaySuperPower.getTodaySuperPower(true)
      }
      msg = todaySuperPower.getTodayMsg()
    } else if (e.msg.includes('昨')) {
      msg = todaySuperPower.getYesterdayMsg()
    } else if (e.msg.includes('明')) {
      if (e.msg.includes('刷新') && e.isMaster) {
        await todaySuperPower.getTomorrowSuperPower(true)
      }
      msg = todaySuperPower.getTomorrowMsg(e.isMaster)
    }
    return await e.reply(msg)
  }

  async action (e) {
    if (!checkEnable(e)) return false

    const data = e.msg.includes('按下')
      ? {
          action: 'press',
          oppositeAction: 'notPress',
          tip: '按下'
        }
      : {
          action: 'notPress',
          oppositeAction: 'press',
          tip: '不按'
        }

    const select = todaySuperPower.setAction(e.user_id, data)
    const msg = todaySuperPower.getTodayMsg(select)
    return await e.reply(msg)
  }

  async review (e) {
    if (!checkEnable(e)) return false
    const message = e.msg.replace(/#?评论\s*/, '')
    if (!message) {
      return false
    }
    const id = todaySuperPower.addReview(message, e.user_id, await e.friend.getAvatarUrl())
    if (Config.todaySuperPower.examineReviewInfo.enable) {
      await e.reply('评论成功,等待审核中~')
      const bot = Bot[Config.todaySuperPower.otherBotInfo.QQ].pickGroup(Config.todaySuperPower.otherBotInfo.group)
      const msg = [segment.at(Number(Config.todaySuperPower.QQBotInfo.QQ)), ' #查看评论' + id]
      const { message_id } = await bot.sendMsg(msg)
      await bot.recallMsg(message_id)
    } else {
      await e.reply('评论成功~')
      todaySuperPower.setReview('pass', id - 1)
    }
    return true
  }

  async lookReview (e) {
    if (!checkEnable(e)) return false
    const reg = /^#?(点赞|举报|点踩|查看|通过|删除)评论\s*([0-9]*)$/
    const regRet = reg.exec(e.msg)
    const id = regRet[2] ? regRet[2] - 1 : -1
    if (regRet[1] == '查看') {
      const isMaster = e.isMaster || e.user_id == Config.todaySuperPower.otherBotInfo.QQBotID
      const msg = await todaySuperPower.getReviewImg(e, id, isMaster)
      return await e.reply(msg)
    } else if (regRet[1] == '通过') {
      if (!e.isMaster) return true
      const msg = todaySuperPower.setReview('pass', id)
      await e.reply(msg, true, { recallMsg: 30 })
    } else if (regRet[1] == '删除') {
      if (!e.isMaster) return true
      const msg = todaySuperPower.setReview('delete', id)
      await e.reply(msg, true, { recallMsg: 30 })
    } else {
      const tip = regRet[1]
      const type = {
        点赞: 'like',
        点踩: 'dislike'
      }[tip]
      const msg = todaySuperPower.setReview(type, id, e.user_id, tip)
      await e.reply(msg, true, { recallMsg: 30 })
    }
    return true
  }
}

function checkEnable (e) {
  if (Config.todaySuperPower.enable === false) return false
  let enable = false
  for (const adapter of Config.todaySuperPower.adapter) {
    let key = e
    for (const i of adapter.key.split('.').slice(1)) {
      try {
        key = key[i]
      } catch (error) {
        continue
      }
    }
    if (key == adapter.value) {
      enable = true
      break
    }
  }
  if (!enable) {
    return false
  }
  return true
}