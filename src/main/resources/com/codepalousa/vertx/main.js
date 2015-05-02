var webServerVerticle = vertx.deployVerticle("com/codepalousa/vertx/webserver.js");
var chatVerticle = vertx.deployVerticle("com/codepalousa/vertx/chat.js");

// Create configuration settings for DB service
var config = {
  "host": "localhost",
  "username": "dphillips",
  "database": "codepalousa",
  "maxPoolSize": 10
};

var options = {
  "config": config
};

// Deploy the database service.
var postgresql = vertx.deployVerticle("service:io.vertx.postgresql-service", options, function(res) {
  var dbService = vertx.deployVerticle("com/codepalousa/vertx/datastore.js");
});