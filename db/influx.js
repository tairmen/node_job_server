const Influx = require('influx');
const config = require('config');

let influx = new Influx.InfluxDB({
    host: config.get('influx.host'),
    database: config.get('influx.database'),
    port: config.get('influx.port'),
});

module.exports = class InfluxDbCon {
    constructor() {
        this.influx = influx;
    }
    getAll(model) {
        this.influx.query(
            `select * from ${model}`
        )
            .catch(err => {
                console.log(err);
            })
            .then(results => {
                console.log(results);
            });
    }
}
