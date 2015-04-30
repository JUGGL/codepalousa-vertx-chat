var Router = require("vertx-apex-js/router");
var SockJSHandler = require("vertx-apex-js/sock_js_handler");
var StaticHandler = require("vertx-apex-js/static_handler");

var router = Router.router(vertx);

// Allow events for the designated addresses in/out of the event bus bridge
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

// Create the event bus bridge and add it to the router.
var ebHandler = SockJSHandler.create(vertx).bridge(opts);
router.route("/eventbus/*").handler(ebHandler.handle);

// Create a router endpoint for the static content.
router.get().handler(StaticHandler.create().handle);

var server = vertx.createHttpServer().requestHandler(router.accept).listen(9080);

console.log("Web server verticle deployed.");