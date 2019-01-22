var express = require('express');
var router = express.Router();
const request = require('request');
const waterfall = require('async/waterfall');
const NodeCache = require('node-cache');
const cache = new NodeCache({
    stdTTL: 3600,
    checkperiod: 3600
}) //3600秒后过过期
const fs = require('fs');

const grant_type = 'client_credential';
const appid = 'wx4c0df69c6d67134c';
const secret = '4edad4d3af22a44b24d1647e1d9691e0';

const getAccessToken = (callback) => {
    const steps = [];
    // 第一步，从cache中获取
    steps.push((cb) => {
        cache.get('access_token', (err, data) => {
            cb(err, data);
        })
    })

    // 第1.2步，缓存中有access_token则直接返回，如果没有，则从服务器中读取access_token
    steps.push((access_token, cb) => {
        if (access_token) {
            cb(null, access_token, 'from_cache')
        } else {
            request('https://api.weixin.qq.com/cgi-bin/token?grant_type=' + grant_type + '&appid=' + appid + '&secret=' + secret, (err, response, body) => {
                cb(err, JSON.parse(body).access_token, 'from_server')
            })
        }
    })

    // 第1.3步，如果是新从服务器取的access_token，则缓存起来，否则直接返回
    steps.push((access_token, from_where, cb) => {
        if (from_where === 'from_cache') {
            console.log(' === 成功从缓存中读取access_token: ' + access_token + ' ===')
            cb(null, access_token)
        } else if (from_where === 'from_server') {
            cache.set('access_token', access_token, (err, success) => {
                if (!err && success) {
                    console.log(' === 缓存已过期，从服务器中读取access_token: ' + access_token + ' ===')
                    cb(null, access_token)
                } else {
                    cb(err || 'cache设置access_token时，出现未知错误')
                }
            })
        } else {
            cb('1.3获取from_where时，from_where值为空')
        }
    })

    waterfall(steps, (err, data) => {
        if (err) {
            res.send({
                status: 'error',
                data: err
            })
        } else {
            callback(data);
        }
    })
}


function httprequest(url, data, callback){
    request({
        url: url,
        method: "POST",
        json: true,
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(data)
    }, function(error, response, body) {
        // console.log(body)
        if (!error && response.statusCode == 200) {
            console.log(body) // 请求成功的处理逻辑
            callback(body);
        }
    });
}

router.use('/getAccessToken', (req, res, next) => {
    getAccessToken((data) => {
        res.send({
            status: 'success',
            data: data
        })
    })
})

router.get('/getCode', function(req, res, next) {
    const { type, page } = req.query;

    getAccessToken((data) => {
        const stream = request({
            url: `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${data}`,
            method: "POST",
            json: true,
            headers: {
                "content-type": "application/json",
            },
            body: {
                scene: `${type}`,
                page
            }
        }).pipe(fs.createWriteStream('./public/images/' + type+'.png'));

        stream.on('finish', () => {
            res.send({
                status: 'success',
                data: '/images/' + type+'.png'
            })
        })
    })
})

module.exports = router;