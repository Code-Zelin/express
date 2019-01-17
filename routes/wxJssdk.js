var express = require('express');
var sha1 = require('sha1');
var jsSHA = require('jssha');
var router = express.Router();

const request = require('request')
const waterfall = require('async/waterfall')
const NodeCache = require('node-cache')
const cache = new NodeCache({
    stdTTL: 3600,
    checkperiod: 3600
}) //3600秒后过过期

var createNonceStr = function () {
    return Math.random().toString(36).substr(2, 15);
};

var createTimestamp = function () {
    return parseInt(new Date().getTime() / 1000) + '';
};

var raw = function (args) {
    var keys = Object.keys(args);
    keys = keys.sort()
    var newArgs = {};
    keys.forEach(function (key) {
        newArgs[key.toLowerCase()] = args[key];
    });

    var string = '';
    for (var k in newArgs) {
        string += '&' + k + '=' + newArgs[k];
    }
    string = string.substr(1);
    return string;
};


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

router.post('/getJssdk', (req, res) => {

    const grant_type = 'client_credential'
    const appid = 'wx209131d6596b95ba'
    const secret = '42b0356cfcde1ffa7419c30c99b6bb9b'

    let steps = []

    // 第一步，获取access_token
    steps.push((cb) => {

        let steps1 = []

        // 第1.1步，从缓存中读取access_token
        steps1.push((cb1) => {
            let access_token = cache.get('access_token', (err, access_token) => {
                cb1(err, access_token)
            })
        })

        // 第1.2步，缓存中有access_token则直接返回，如果没有，则从服务器中读取access_token
        steps1.push((access_token, cb1) => {
            if (access_token) {
                cb1(null, access_token, 'from_cache')
            } else {
                request('https://api.weixin.qq.com/cgi-bin/token?grant_type=' + grant_type + '&appid=' + appid + '&secret=' + secret, (err, response, body) => {
                    cb1(err, JSON.parse(body).access_token, 'from_server')
                })
            }
        })

        // 第1.3步，如果是新从服务器取的access_token，则缓存起来，否则直接返回
        steps1.push((access_token, from_where, cb1) => {
            if (from_where === 'from_cache') {
                console.log(' === 成功从缓存中读取access_token: ' + access_token + ' ===')
                cb1(null, access_token)
            } else if (from_where === 'from_server') {
                cache.set('access_token', access_token, (err, success) => {
                    if (!err && success) {
                        console.log(' === 缓存已过期，从服务器中读取access_token: ' + access_token + ' ===')
                        cb1(null, access_token)
                    } else {
                        cb1(err || 'cache设置access_token时，出现未知错误')
                    }
                })
            } else {
                cb1('1.3获取from_where时，from_where值为空')
            }
        })

        waterfall(steps1, (err, access_token) => {
            cb(err, access_token)
        })
    })


    // 第二步，获取ticket
    steps.push((access_token, cb) => {
        let steps1 = []

        // 第2.1步，从缓存中读取ticket
        steps1.push((cb1) => {
            let ticket = cache.get('ticket', (err, ticket) => {
                cb1(err, ticket)
            })
        })

        // 第2.2步，缓存中有ticket则直接返回，如果没有，则从服务器中读取ticket
        steps1.push((ticket, cb1) => {
            if (ticket) {
                cb1(null, ticket, 'from_cache')
            } else {
                request('https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=' + access_token + '&type=jsapi', (err, response, body) => {
                    cb1(err, JSON.parse(body).ticket, 'from_server')
                })
            }
        })

        // 第2.3步，如果新从服务器取的ticket，则缓存起来，否则直接返回
        steps1.push((ticket, from_where, cb1) => {
            if (from_where === 'from_cache') {
                console.log(' === 成功从缓存中读取ticket: ' + ticket + ' ===')
                cb1(null, ticket)
            } else if (from_where === 'from_server') {
                cache.set('ticket', ticket, (err, success) => {
                    if (!err && success) {
                        console.log(' === 缓存已过期，从服务器中读取ticket: ' + ticket + ' ===');
                        cb1(null, ticket)
                    } else {
                        cb1(err || 'cache设置ticket时，出现未知错误')
                    }
                })
            } else {
                cb1('2.3获取from_where时，from_where值为空')
            }
        })

        waterfall(steps1, (err, ticket) => {
            cb(err, ticket)
        })
    })


    // 第三步，生成签名
    steps.push((ticket, cb) => {
        let jsapi_ticket = ticket
        // let nonce_str = '4eHjBlJaPlNYW6hv0q7VKyM8Piw7Iboho95MV1YchBZ'

        let nonce_str = createNonceStr();
        let timestamp = createTimestamp();
        let url = req.body.url;

        let str = 'jsapi_ticket=' + jsapi_ticket + '&noncestr=' + nonce_str + '&timestamp=' + timestamp + '&url=' + url
        console.log(url, str);
        let shaObj = new jsSHA(str, 'TEXT');
        let signature = shaObj.getHash('SHA-1', 'HEX');

        cb(null, {
            appId: appid,
            timestamp: timestamp,
            nonceStr: nonce_str,
            signature: signature,
            ticket: ticket
        })
    })

    waterfall(steps, (err, data) => {
        if (err) {
            res.send({
                status: 'error',
                data: err
            })
        } else {
            res.send({
                status: 'success',
                data: data
            })
        }
    })
})


module.exports = router;