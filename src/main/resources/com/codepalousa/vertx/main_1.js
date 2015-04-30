var webVerticle = vertx.deployVerticle("com/codepalousa/vertx/webserver.js");
var chatVerticle = vertx.deployVerticle("com/codepalousa/vertx/chat.js");