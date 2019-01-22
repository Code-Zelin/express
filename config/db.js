const mysql = require('mysql');

var db = new Object();

db.query = function sqlback(sqllan, fn) {
    const connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'R55DVzqNjHuHhhNx',
        database: 'oa',
        port: 3306
    })

    connection.connect((err) => {
        if(err) {
            console.log(err);
            return false;
        }
    });

    var sql = sqllan;
    if (!sql) return false;

    connection.query(sql, (err, rows, fields) => {
        if(err) {
            console.log(err);
            return false;
        }
        fn(rows);
    });

    connection.end((err) => {
        if (err) {
            return false;
        } else {
            console.log('连接关闭');
        }
    })
}

module.exports = db;