var eb = vertx.eventBus();

eb.consumer("client.to.server").handler(function(message) {
  var msg = message.body();
  console.log("New Message: "+JSON.stringify(msg));
  var msgTime = new Date();
  msg['timestamp'] = msgTime.toISOString();
  eb.publish("server.to.client", msg);
});

console.log("Chat verticle deployed.");