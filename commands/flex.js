import template from '../template/tem_flex.js'
import template2 from '../template/tem_quick.js'
import { data, data1 } from '../data.js'
import transform from '../lonLatTransform.js'
import { distance } from '../lonLatDistance.js'
import axios from 'axios'

export default async (event) => {
  const flex = JSON.parse(JSON.stringify(template))
  const quick = JSON.parse(JSON.stringify(template2))
  // const flexth = JSON.parse(JSON.stringify(template3))
  const trail = event.message.text.replace('!trail ', '')
  const train = event.message.text.replace('!train ', '')

  try {
    flex.altText = '多久沒運動了你'
    flex.altText = '多久沒運動了你'
    for (const info of data) {
      // 跑 data 這個陣列內含有 trail 的值，這裡是回傳該 trail 所屬的整個物件
      if (info.TR_CNAME === trail) {
        // !trail /步道名稱/ -> 顯示所有登山口
        for (let i = 0; i < info.TR_ENTRANCE.length; i++) {
          flex.contents.contents.length = info.TR_ENTRANCE.length
          flex.contents.contents[i].body.contents[0].text = info.TR_ENTRANCE[i].memo + '入口' + `(${i + 1}/` + info.TR_ENTRANCE.length + ')'
          flex.contents.contents[i].body.contents[2].contents[0].contents[0].text = '📍海拔➟ ' + info.TR_ENTRANCE[i].height + ' 公尺\n👉點我查看地圖位置'
          flex.contents.contents[i].body.action.text = '@trailhead ' + info.TR_ENTRANCE[i].memo
          // flex.contents.contents[i].body.contents[2].contents[0].contents[0].text = '📍入口➟'
        }
        event.reply(
          [flex, quick]
        )
        return
      }
      for (const ts of data1) {
        if (ts.stationName === train) {
          const newGps = ts.gps.split(' ')
          const Px = newGps[0]
          const Py = newGps[1]
          const arr = []
          const array = []

          for (let i = 0; i < data.length; i++) {
            // 總共 125 筆資料，但是第 120 筆沒有登山口的座標資料，需要 continue 跳過，所以會回傳 124 筆
            if (i === 120) { continue }
            const dt = distance(Px, Py, transform(data[i].TR_ENTRANCE[0].x, data[i].TR_ENTRANCE[0].y).lat, transform(data[i].TR_ENTRANCE[0].x, data[i].TR_ENTRANCE[0].y).lng, 'K')
            const trail = data[i].TR_CNAME
            const ent = data[i].TR_ENTRANCE[0].memo
            const url = data[i].URL
            const len = data[i].TR_LENGTH
            const tra = data[i].TRAILID
            const dif = data[i].TR_DIF_CLASS
            const alt = data[i].TR_ALT
            // 將距離四捨五入到小數點第二位
            function roundToTwo (num) {
              return +(Math.round(num + 'e+2') + 'e-2')
            }
            const object = { trailName: trail, Entrance: ent, DistanceKm: roundToTwo(dt), Length: len, Url: url, Trail: tra, Dif: dif, Alt: alt }
            array.push(object)
            arr.push(roundToTwo(dt))
          }
          // 124 筆資料由小到大排序
          const sequence = arr.sort((a, b) => {
            return a - b
          })
          // 最外層的 for of 得從 sequence 跑，距離才會由小到大排序
          const z = []
          for (let i = 0; i < sequence.length; i++) {
            for (let j = 0; j < array.length; j++) {
              if (sequence[i] === array[j].DistanceKm) {
                z.push(array[j])
              }
            }
          }
          // !train /火車站/ -> 顯示最近的 8 個步道
          for (let i = 0; i < 8; i++) {
            flex.contents.contents.length = 8
            flex.contents.contents[i].body.contents[0].text = '🌳 ' + z[i].trailName
            // 方法一、讓無效的圖片網址空白
            // 1.
            // flex.contents.contents[i].hero.url = 'https://recreation.forest.gov.tw/Files/RT/Photo/' + z[i].Trail + '/05/01.jpg'
            // 2.
            // flex.contents.contents[i].hero.url = 'https://recreation.forest.gov.tw/Files/RT/Photo/' + z[i].Trail + '/05/' + z[i].Trail + '.jpg'

            // 方法二、假圖放空格，但這裡必須要 await，用此方法會等待他跑 8 次才會回覆 !flex，大概隔 3 秒。
            // 這邊必須使用 await，否則圖片會失效
            // 1.
            // await axios.get('https://recreation.forest.gov.tw/Files/RT/Photo/' + z[i].Trail + '/05/01.jpg')
            //   .then(({ data }) => {
            //     // console.log('yes')
            //     flex.contents.contents[i].hero.url = 'https://recreation.forest.gov.tw/Files/RT/Photo/' + z[i].Trail + '/05/01.jpg'
            //   }).catch(error => {
            //     // console.log('no')
            //     flex.contents.contents[i].hero.url = 'https://picsum.photos/1920/1080/?random=' + `${i + 15}`
            //   })
            // 2.
            await axios.get('https://recreation.forest.gov.tw/Files/RT/Photo/' + z[i].Trail + '/05/' + z[i].Trail + '.jpg')
              .then(({ data }) => {
                // 如果這個網址有效
                flex.contents.contents[i].hero.url = 'https://recreation.forest.gov.tw/Files/RT/Photo/' + z[i].Trail + '/05/' + z[i].Trail + '.jpg'
              }).catch((error) => {
                // 如果這個網址無效
                console.log(error)
                flex.contents.contents[i].hero.url = 'https://recreation.forest.gov.tw/Files/RT/Photo/' + z[i].Trail + '/05/01.jpg'
              })
            // 方法三、取出 z[i].Trail，得到距離最近的資料，每個步道各別的介紹網站，用 cheerio 並取出他們的封面圖(目前抓到不 length -> !new 將 axios.get 內的網址用樣板字串(用反引號)變成字串才行 )
            // 問題: 不用 await 會出錯，用了要等很久才會回復，大概等 10 秒左右，因為 await 這裡大概 1 秒跑一次。
            // const { data } = await axios.get(`https://recreation.forest.gov.tw/Trail/RT?tr_id=${z[i].Trail}`)
            // const $ = cheerio.load(data)
            // console.log($('.images img').eq(0).attr('src'))
            // console.log('-----------------')
            // flex.contents.contents[i].hero.url = 'https://recreation.forest.gov.tw/' + $('.images img').eq(0).attr('src')

            // text 只給變數會無效，需要給一個字串
            flex.contents.contents[i].body.contents[2].contents[0].contents[0].text = '📍入口➟' + z[i].Entrance + '\n📍距離➟' + z[i].DistanceKm + '公里\n📍全長➟' + z[i].Length + '\n📍海拔➟' + z[i].Alt + '公尺\n\n👉點我查看所有入口'
            flex.contents.contents[i].body.action.text = '!trail ' + z[i].trailName
            flex.contents.contents[i].body.contents[1].contents[5].size = 'sm'
            flex.contents.contents[i].body.contents[1].contents[5].text = 'EXPE'
            flex.contents.contents[i].body.contents[1].contents[5].color = '#800080'
            flex.contents.contents[i].body.contents[2].contents[0].margin = 'md'
            if (z[i].Dif === '1') {
              for (let j = 1; j < 4; j++) {
                flex.contents.contents[i].body.contents[1].contents[j].url = 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gray_star_28.png'
                flex.contents.contents[i].body.contents[1].contents[5].text = 'EASY'
                flex.contents.contents[i].body.contents[1].contents[5].color = '#00aa00'
              }
            } else if (z[i].Dif === '2') {
              for (let j = 2; j < 4; j++) {
                flex.contents.contents[i].body.contents[1].contents[j].url = 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gray_star_28.png'
                flex.contents.contents[i].body.contents[1].contents[5].text = 'NORM'
                flex.contents.contents[i].body.contents[1].contents[5].color = '#ff8c00'
              }
            } else if (z[i].Dif === '3') {
              for (let j = 3; j < 4; j++) {
                flex.contents.contents[i].body.contents[1].contents[j].url = 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gray_star_28.png'
                flex.contents.contents[i].body.contents[1].contents[5].text = 'HARD'
                flex.contents.contents[i].body.contents[1].contents[5].color = '#ff0000'
              }
            } else if (z[i].Dif === '5') {
              flex.contents.contents[i].body.contents[1].contents[4].url = 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png'
              flex.contents.contents[i].body.contents[1].contents[5].text = 'IMPO'
              flex.contents.contents[i].body.contents[1].contents[5].color = '#d2691e'
            }
          }
          event.reply([flex, quick])
          return
        }
      }
    }
    event.reply([{ type: 'text', text: '找不到，請再試一次' }, quick])
  } catch (error) {
    console.log(error)
    event.reply([{ type: 'text', text: '發生錯誤' }, quick])
  }
}
