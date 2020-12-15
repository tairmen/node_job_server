const mysql = require("mysql2");
const config = require('config');

let dbcon = mysql.createConnection({
    host: config.get('db.host'),
    user: config.get('db.user'),
    port: config.get('db.port'),
    database: config.get('db.database'),
    password: config.get('db.password')
});
dbcon.connect(function (err) {
    if (err) {
        return console.error("Error: " + err.message);
    } else {
        console.log("Connected to MySQL");
    }
});

module.exports = class MySqlCon {
    constructor() {
        this.dbcon = dbcon;
    }
    are_hub_exist(id, callback = () => {}) {
        this.dbcon.query(`SELECT * from hubs where id=${id}`, 
        function(err, results, fields) {
            console.log("hub:", results);
            if (results.length > 0) {
                callback(true, results[0]);
            } else {
                callback(false);
            }
        })
    }
}