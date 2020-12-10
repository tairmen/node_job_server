const config = require('config');
let redis = require("redis");

let client = redis.createClient({
    host: config.get('redis.host'),
    port: config.get('redis.port'),
});
if (config.get('redis.password')) {
    client.auth(config.get('redis.password'))
}
client.on("connect", function () {
    console.log("Connected to Redis");
});

module.exports = class RedisStore {
    constructor() {
        this.client = client;
    }
    push_hub_list(value) {
        this.client.lpush("hubs", value, function (err, res) {
            console.log(err, res);
        });
    }
    set_hub_token(id, token) {
        this.client.hmset("hub_tokens", [id, token], function (err, res) {
            console.log(err, res);
        });
    }
    set_hub_status(id, value) {
        this.client.hmset("hub_states", [id, value], function (err, res) {
            console.log(err, res);
        });
    }
    get(key) {
        this.client.get(key, function (err, res) {
            console.log(err, res);
        });

    }
}

