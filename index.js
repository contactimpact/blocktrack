const express = require('express'),
      redis   = require('redis'),
      parser= require('ua-parser-js'),
      url     = require('url'),
      moment  = require('moment'),
      async   = require('async'),
      nconf   = require('nconf');

nconf.env().argv();

nconf.defaults({
  port: 3000,
  host: '0.0.0.0',
  redis: {
    host: 'localhost',
    port: 6379
  }
});

const redisClient = redis.createClient(nconf.get('redis'))

var pixel = new Buffer([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x2c,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02,
  0x02, 0x44, 0x01, 0x00, 0x3b]);

const app = express();

app.get('/test', function(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  setInterval(function() {
    res.write('hi\n');
    res.flush();
  },500)
});

app.get('/stats', function(req, response) {
  var date = moment().format('YYYYMMDD');
  if (req.query.date) {
    date = moment(req.query.date).format('YYYYMMDD');
  }
  var result = {};
  async.eachSeries(['0', '1', '2'], function(value, nextValue) {
    async.parallel({
      sum: function (nextKey) {
        redisClient.get(date + '-' + value, nextKey);
      },
      byReferer: function (nextKey) {
        redisClient.zrangebyscore('host-' + date + '-' + value, 0, 10000000, 'withscores', nextKey)
      },
      byUserAgent: function (nextKey) {
        redisClient.zrangebyscore('ua-' + date + '-' + value, 0, 10000000, 'withscores', nextKey);
      }
    }, function(keyError, keyRes) {
      result[value] = keyRes;
      return nextValue(keyError);
    });
  }, function(err, res) {
    if (err) {
      console.log(err);
      return res.status(500);
    }
    response.json(result);
    /*
      {"0":{"sum":"3","byReferer":["www.businessinsider.de","3"],"byUserAgent":["Chrome","3"]},"1":{"sum":"15","byReferer":["www.businessinsider.de","7"],"byUserAgent":["Chrome","15"]},"2":{"sum":"4","byReferer":["www.businessinsider.de","4"],"byUserAgent":["Chrome","4"]}}
     */
  });

});

app.get('/s.png', function(req, res) {
  res.writeHead(200, {'Content-Type': 'image/gif'});
  res.end(pixel, 'binary');

  // only if valid b value
  if (!req.query.b && req.query.b!=="0") return;

  // get user agent
  var ua = parser(req.headers['user-agent']);

  // get referers hostname if exist
  if (req.headers.referer) {
    var parsedUrl = url.parse(req.headers.referer);
    var hostname = parsedUrl.hostname;
  }
  // current date
  var date = moment().format('YYYYMMDD');

  redisClient.zincrby('ua-'+date+'-'+req.query.b, 1, ua.browser.name);
  if (hostname) {
    redisClient.zincrby('host-'+date+'-'+req.query.b, 1, hostname);
  }
  redisClient.incr(date+'-'+req.query.b);
});

app.listen(nconf.get('port'), nconf.get('host'), () => {
  console.log('listening on', nconf.get('port'), nconf.get('host'));
});