const config = require('config');
const e = require('express');
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
        this.client.sadd("hubs", value, function (err, res) {
            if (!err) {
                console.log("REDIS hubs", res);
            } else {
                console.log(err);
            }
            
        });
    }
    set_hub_token(id, token) {
        this.client.hmset("hub_tokens", [id, token], function (err, res) {
            if (!err) {
                console.log("REDIS hub_tokens", res);
            } else {
                console.log(err);
            }
        });
    }
    set_hub_status(id, value) {
        this.client.hmset("hub_states", [id, value], function (err, res) {
            if (!err) {
                console.log("REDIS hub_states", res);
            } else {
                console.log(err);
            }
        });
    }
    get(key) {
        this.client.get(key, function (err, res) {
            console.log("REDIS", err, res);
        });

    }
}

