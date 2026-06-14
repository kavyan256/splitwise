const Redis = require('ioredis')

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
})

const subscriber = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
})

redis.on('connect', () => console.log('Connected to Redis'))
redis.on('error', (err) => console.error('Redis error:', err))
subscriber.on('connect', () => console.log('Connected to Redis (Subscriber)'))
subscriber.on('error', (err) => console.error('Redis (Subscriber) error:', err))

module.exports = { redis, subscriber }  