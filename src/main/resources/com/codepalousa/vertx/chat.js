/* global java */
/* global vertx */

var eb = vertx.eventBus();

// Receive message from the browser and then broadcast those message back out to all connected clients.
eb.consumer("client.to.server").handler(function(message) {
  console.log("Message from client: "+message.body().content);
  var reply = message.body();
  var msgTime = new Date();
  reply["timestamp"] = msgTime.toLocaleDateString()+' '+msgTime.toLocaleTimeString();
  console.log("Java Thread: "+java.lang.Thread.currentThread().getName());
  var stackElements = java.lang.Thread.currentThread().getStackTrace();
  for (var i=0; i<stackElements.length; i++) {
    console.log("Stack Item: "+i+": "+stackElements[i].getFileName()+":"+stackElements[i].getLineNumber())
  }
  
  eb.publish("server.to.client", reply);
//  eb.send("store.message", [reply.user, msgTime.toISOString(), reply.content]);
});

console.log("Chat verticle deployed.");