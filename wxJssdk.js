var express = require('express');
var sha1 = require('sha1');
var router = express.Router();

const request = require('request')

/* GET home page. */
router.get('/', function (req, res, next) {
    let wx = req.query

    let token = 'interesting'
    let timestamp = wx.timestamp
    let nonce = wx.nonce

    // 1）将token、timestamp、nonce三个参数进行字典序排序
    let list = [token, timestamp, nonce].sort()

    // 2）将三个参数字符串拼接成一个字符串进行sha1加密
    let str = list.join('')
    let result = sha1(str)

    // 3）开发者获得加密后的字符串可与signature对比，标识该请求来源于微信
    if (result === wx.signature) {
        res.send(wx.echostr) // 返回微信传来的echostr，表示校验成功，此处不能返回其它
    } else {
        res.send(false)
    }
});

router.post('/wxJssdk/getJssdk', (req, res) => {
    const request = require('request')

    const grant_type = 'client_credential'
    const appid = 'wxc8c7374f6e5c78a5'
    const secret = '8f97892c143677c87a94ab72250e98bb'

    request('https://api.weixin.qq.com/cgi-bin/token?grant_type=' + grant_type + '&appid=' + appid + '&secret=' + secret, (err, response, body) => {
        let access_toekn = JSON.parse(body).access_token

        request('https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=' + access_token + '&type=jsapi', (err, response, body) => {
            let jsapi_ticket = JSON.parse(body).ticket
            let nonce_str = '123456' // 密钥，字符串任意，可以随机生成
            let timestamp = new Date().getTime() // 时间戳
            let url = req.query.url // 使用接口的url链接，不包含#后的内容

            // 将请求以上字符串，先按字典排序，再以'&'拼接，如下：其中j > n > t > u，此处直接手动排序
            let str = 'jsapi_ticket=' + jsapi_ticket + '&noncestr=' + nonce_str + '×tamp=' + timestamp + '&url=' + url

            // 用sha1加密
            let signature = sha1(str)

            res.send({
                appId: appid,
                timestamp: timpstamp,
                nonceStr: nonce_str,
                signature: signature,
            })
        })
    })
})

module.exports = router;