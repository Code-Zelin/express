var express = require('express');
var router = express.Router();


var mysql = require('../config/db');

const queryAll = () => {
  const promise = new Promise((resolve) => {
    const result = mysql.query('select * from user', function(data) {
      resolve(data);
    })
  });
  return promise();
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/add', function(req, res, next) {
  const { openId, parentOpenId } = req.body;
  console.log(openId, parentOpenId);
  const result = mysql.query(`INSERT INTO user (parentOpenId, openId) VALUES (${parentOpenId||''}, ${openId})`, function(data) {
    console.log(data);
    res.send(data)
  })
})

module.exports = router;
