var Router = require("vertx-apex-js/router");
var SockJSHandler = require("vertx-apex-js/sock_js_handler");
var StaticHandler = require("vertx-apex-js/static_handler");

var router = Router.router(vertx);

router.get("/*").handler(StaticHandler.create().handle);

var opts = {
  "inboundPermitteds" : [
    {
      "address" : "client.to.server"
    }
  ],
  "outboundPermitteds" : [
    {
      "address" : "server.to.client"
    }
  ]
};

var eb = vertx.eventBus();

var ebHandler = SockJSHandler.create(vertx).bridge(opts);
router.route("/eventbus/*").handler(ebHandler.handle);

var server = vertx.createHttpServer().requestHandler(router.accept).listen(9080);

console.log("Web server verticle deployed.");