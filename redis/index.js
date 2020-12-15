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
                console.log("REDIS push_hub_list", res);
            } else {
                console.log(err);
            }
            
        });
    }
    set_hub_token(id, token) {
        this.client.hmset("hub_tokens", [id, token], function (err, res) {
            if (!err) {
                console.log("REDIS set_hub_token", res);
            } else {
                console.log(err);
            }
        });
    }
    set_hub_status(id, value) {
        this.client.hmset("hub_states", [id, value], function (err, res) {
            if (!err) {
                console.log("REDIS set_hub_status", res);
            } else {
                console.log(err);
            }
        });
    }
    are_id_exist(id, callback = () => {}) {
        this.client.sismember("hubs", id, function (err, res) {
            if (!err) {
                callback(res)
                console.log("REDIS are_id_exist", res);
            } else {
                console.log(err);
            }
        });
    }
    delete_all() {
        this.client.del("hubs", "hub_states", "hub_tokens", function (err, res) {
            if (!err) {
                console.log("REDIS cleared", res);
            } else {
                console.log(err);
            }
        });
    }
}

