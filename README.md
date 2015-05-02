# codepalousa-vertx-chat-example

## Overview
This project is a presentation which was originally created for Code PaLOUsa 2015 (http://codepalousa.com) to demonstrate 
writing reactive/clustered application in Vert.x using JavaScript. The content below is the speaker's notes and are 
updated as errors are found or improvements are discovered.

## Introductory Slides

http://slides.com/devenphillips/codepalousa-2015-vertx/

## Speaker's Notes

    mvn archetype:generate -DarchetypeGroupId=com.zanclus.codepalousa -DarchetypeArtifactId=vertx-js-archetype

After creating the maven project from the Archetype, we will be left with a new stub project which has a single verticle:

    src/main/resources/com/codepalousa/vertx/main.js

Initially, this fille will ONLY contain:

    /* global vertx */

This is a JSlint "hint" to let us know that whenever Vert.x loads a JavaScript file, the "vertx" object is already created as a global variable in our scope.

Here's the JavaScript code for a simple web server which returns "Hello Vert.x!":

    /* global vertx */
    var server = vertx.createHttpServer();
    server.requestHandler(function(req) {
      req.response().putHeader("Content-Type", "text/html").end("<html><body><h1>Hello Vert.x!</h1></body></html>");
    });
    server.listen(9080);

Let's dissect this a bit to make sure that we understand what is happening.

1. We create a “server” instance. Vert.x has HTTP servers as part of the base API, so we just ask for an instance.
2. Next, we call *requestHandler* with an argument of a *function literal/lambda/closure*.
3. The function literal will be called every time a new request comes in to the web server and it will return "Hello Vert.x!" in HTML.
4. Finally, we tell the server to start listening for new requests on a given port (We could also specify the listening address here if we wanted).

We could shorten this up a bit if we like by using the fluent APIs of Vert.x:

    /* global vertx */
    vertx.createHttpServer().requestHandler(function(req) {
        req.response().putHeader("Content-Type", "text/html").end("<html><body><h1>Hello Vert.x!</h1></body></html>");
    }).listen(9080);

Though this is a little less typing, it somewhat hinders readability. Since the code is already VERY concise, I will err on the side of readability throughout this workshop so that everyone can readily follow along. Almost ALL of Vert.x's APIs are fluent and can be chained together, so you are welcome to use that in your own code.

Next, let's create a second verticle.. In the same folder as *main.js*, create *ping-endpoint.js*.

Now, we will tell Vert.x to use the event bus to listen for messages:

    /* global vertx */
    
    // Get a reference to the event bus from the global "vertx" instance
    var eb = vertx.eventBus();
    
    // Register a consumer for messages addresses to "ping-address" on the event bus
    eb.consumer(“ping-address”, function(message) {
        // This is a "function literal"/"lambda"/"closure" where we handle the message received from the event bus
        
        console.log(“Recieved Message: “ + message.body);
        eb.publish(“pong-address”, “pong!”);
    });

This is another simple Verticle which makes use of some core functionality in Vert.x, the Event Bus. Every verticle inside of a given Vert.x instance shares access to this event bus. Moreso, when you use the clustering option, which I will demonstrate later, multiple instances of Vert.x across multiple hosts can share an event bus so that you can build distributed systems.

Now, let's have our HTTP server send pings every time we make an HTTP request:

    /* global vertx */
    var server = vertx.createHttpServer();
    
    // Here, we are deploying another verticle programmatically
    vertx.deployVerticle(“com/codepalousa/vertx/ping-endpoint.js”);
    
    server.requestHandler(function(req) {
        req.response().putHeader("Content-Type", "text/html").end("<html><body><h1>Hello Vert.x</h1></body></html>");
        vertx.eventBus().publish(“ping-address”, “ping!”);
    });
    
    // Register a consumer for messages addresses to "pong-address" on the event bus
    vertx.eventBus().consumer(“pong-address”, function(message) {
        console.log(“Reply: “+message.body());
    });
    server.listen(9080);

When we run this, every time that someone makes an HTTP request, the main Verticle will publish a message to the *ping-address* on the event bus, and we will see the request and the response logged to STDOUT:

    $ java -jar target/codepalousa-vertx-example-1.0-SNAPSHOT-fat.jar 
    Ping verticle deployed
    Apr 20, 2015 10:06:46 AM io.vertx.core.Starter
    INFO: Succeeded in deploying verticle
    Received Ping: ping!
    Received reply: pong!
    Received Ping: ping!
    Received reply: pong!
    Received Ping: ping!
    Received reply: pong!
    Received Ping: ping!
    Received reply: pong!

This is a perfect opportunity to show up Vert.x clustering. To set up clustering is relatively simple. By default Vert.x uses multicast DNS to to find cluster nodes on the local network. The steps to make this work are as follows:

1. Copy the “default-cluster.xml” file into your project as “src/main/resources/cluster.xml”.
2. Edit the “cluster.xml” file in your project and change the <interfaces> tag so that enabled=true
3. Modify the interface address to match the local network.
4. Modify the pom.xml to use the cluster arguments to start your verticle.

NOTE!!! When you run this inside of a docker container or a VM you will have to jump through extra hoops to ensure that the interfaces/ports/etc… are all correct.


Now, let's turn this into a basic static HTTP server which will return content based on the requested path/filename..

    /* global vertx */
    var server = vertx.createHttpServer();
    
    // This is the path from which our web server will try to serve files.
    var basePath = “/var/www/html”;
    
    server.requestHandler(function(req) {
      var file = req.path();
      
      // If the request is for the root of the web application, return "index.html".
      if (file==="/") {
        file = "/index.html";
      }
      
      // Use the request path appended to the basePath to locate a file and use the asynchronous "sendFile" method
      // to return the content to the browser.
      req.response().sendFile(basePath+file, function(res, error) {
        if (error!=null) {
          // If there is an error trying to send the requested file it is probably because the file does not exist
          // So, we need to send a 404 status code.
          console.log("File '"+file+"' not found.");
          req.response().setStatusCode(404).setStatusMessage("NOT FOUND").end();
        }
      });
    });
    
    // Tell the HTTP server to start listening on port 9080 for new requests.
    server.listen(9080);

The sendFile() function runs asynchronously, so it may not complete until some time after the function call returns (usually almost instantaneous).

OK, serving static content is pretty simple. Let's move more into the “web application” realm. This requires the use of the [Vert.x Apex extension](http://vert-x3.github.io/docs/vertx-apex/js/). Apex provides tools for making more complex web applications. 

    /* global vertx */
    var server = vertx.createHttpServer();
    
    var Router = require("vertx-apex-js/router");
    var router = Router.router(vertx);
    
    router.route("/rest/v1/todo").handler(function(routingContext) {
      var response = routingContext.response();
      response.putHeader("Content-Type", "text/html");
      response.end("<html><body><h1>Hello Vert.x!!!</h1></body></html>");
    });
 
    server.requestHandler(router.accept).listen(9080);

The Router allows us to specify the exact request path which our handler will be called for. You can specify multiple handlers for a single path and call routingContext.next() in order to have the “next” handler also write to the output stream.

    /* global vertx */
    var server = vertx.createHttpServer();
    
    var Router = require("vertx-apex-js/router");
    var router = Router.router(vertx);
    
    // Register a handler for requests to "/rest/v1/todo" and set the response to be "chunked" so we can 
    // append to the output
    router.route("/rest/v1/todo").handler(function(routingContext) {
      var response = routingContext.response();
      response.putHeader("Content-Type", "text/html");
      response.setChunked(true);
      response.write("<html><body><h1>Hello Vert.x!!!</h1></body></html>");
      
      // Tell Vert.x that 100ms after this content is sent that we want any other handlers registered to handle this
      // path to be applied.
      routingContext.vertx().setTimer(100, function(tld) {
        routingContext.next();
      });
    });
    
    // This handler ALSO affects requests to "/rest/v1/todo" and it's output will come AFTER the first handler because
    // of the timer in the first handler causing a delay.
    router.route("/rest/v1/todo").handler(function(routingContext) {
      var response = routingContext.response();
      response.setChunked(true);
      response.write("<!-- Comment at the end -->");
      response.end();
    });
    
    // router.accept is the "handler" for the requestHandler.
    server.requestHandler(router.accept).listen(9080);

But static URLs SUCK, so let's make it more useful!

    /* global vertx */
    var server = vertx.createHttpServer();
    
    var Router = require("vertx-apex-js/router");
    var router = Router.router(vertx);
    
    router.route("/rest/v1/todo/:id").handler(function(routingContext) {
      var response = routingContext.response();
      response.putHeader("Content-Type", "text/html");
      response.setChunked(true);
      response.write("<html><body><h1>Hello Vert.x!!! - "+routingContext.request().getParam("id")+"</h1></body></html>");
      routingContext.vertx().setTimer(100, function(tld) {
        routingContext.next();
      });
    });
    
    router.route("/rest/v1/todo/:id").handler(function(routingContext) {
      var response = routingContext.response();
      response.setChunked(true);
      response.write("<!-- Comment at the end -->");
      response.end();
    });
    
    server.requestHandler(router.accept).listen(9080);

This is demonstrating how to insert path parameters into the router so that it is easy to use URL based params..

But for ReST APIs, we will want to break out the different HTTP methods:

    /* global vertx */
    var server = vertx.createHttpServer();
    
    var Router = require("vertx-apex-js/router");
    var router = Router.router(vertx);
    
    router.get("/rest/v1/todo").handler(function(routingContext) {
      var response = routingContext.response();
      response.putHeader("Content-Type", "text/html");
      response.setChunked(true);
      response.end("<html><body><h1>Hello Vert.x!!!</h1></body></html>");
    });
    
    router.post("/rest/v1/todo").handler(function(routingContext) {
      var response = routingContext.response();
      response.setStatusCode(202).setStatusMessage("ACCEPTED").putHeader("Content-Type", "text/plain").end("SUCCESS");
    });
    
    server.requestHandler(router.accept).listen(9080);

So that get's you through the basics of HTTP related stuff in Vert.x… Now, let's write a real application. A webchat which makes use of Vert.x's ability to bridge the event bus over WebSockets to the browser! Oh, and for giggles, we'll make it distrubuted so that different parts run on different hosts in an HA configuration!

So, create a new project from the archetype we used in the beginning:

    mvn archetype:generate -DarchetypeGroupId=com.zanclus.codepalousa -DarchetypeArtifactId=vertx-js-archetype -DarchetypeVersion=3.0.0.6

Let's start with the main verticle… For automatic redeployment purposes, this verticle will do nothing but load our other verticles.

    /* global vertx */
    var verticleId = vertx.deployVerticle("com/codepalousa/vertx/webserver.js");
    var verticleId = vertx.deployVerticle("com/codepalousa/vertx/chat.js");

Because of how the automatic redeloyment works, the main verticle cannot be reloaded, but every other verticle can be.

Next, we create our webserver.js verticle:

    /* global vertx */
    var Router = require("vertx-apex-js/router");
    var SockJSHandler = require("vertx-apex-js/sock_js_handler");
    var StaticHandler = require("vertx-apex-js/static_handler");
    
    // Create an instance of an Apex Router
    var router = Router.router(vertx);

    // Allow events for the designated addresses in/out of the event bus bridge
    // ONLY addresses listed here are allowed to traverse the Event Bus to/from the browser
    var opts = {
      "inboundPermitteds" : [
        {
          "address" : "chat.to.server"
        }
      ],
      "outboundPermitteds" : [
        {
          "address" : "chat.to.client"
        }
      ]
    };

    // Create the event bus bridge and add it to the router.
    // This uses web sockets to "bridge" the event bus to the browser
    var ebHandler = SockJSHandler.create(vertx).bridge(opts);
    router.route("/eventbus/*").handler(ebHandler.handle);

    // Create a router endpoint for the static content.
    router.route().handler(StaticHandler.create().handle);

    var server = vertx.createHttpServer().requestHandler(router.accept).listen(9080);

    console.log("Web server verticle deployed.");

We'll use several Vert.x extensions here. Apex, auth-service, and core. 

Vert.x has a component called the SockJSHandler which allows you to connect from a Vert.x event bus implementation in the browser to the event bus on the server/cluster. This means that you can send event bus messages to/from the browser and have a completely reactive application. No need for server polling, no need for rest requests, just events!

We'll need to create a place to store our static HTML/CSS/JavaScript content for the web application. The StaticHandler which is built-in to Vert.x defaults to a directory in the working directory called “webroot”. For our maven project, the working directory is <project dir>/src/main/resources/

In that directory, we need to create an index.html page which will have our UI and we will also need to copy in the *vertxbus.js* library for the browser.

The *vertxbus.js* file can be found in the Vert.x distribution archive we downloaded earlier *<root>/client/vertxbus-<version>.js*

    <html>
    <head>
      <title>Distributed Chat Service</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://code.jquery.com/jquery-1.11.2.min.js"></script>
      <script src="//cdn.jsdelivr.net/sockjs/0.3.4/sockjs.min.js"></script>
      <script src="vertxbus.js"></script>
      <script src="app.js"></script>
      <link href="styles.css" type="text/css" rel="stylesheet"/>
    </head>
    <body>
    Name: <input id="name" type="text" size="40">
    <div id="chat" class="inset"></div>
    <input id="input" type="text" onkeydown="keyUpEvent(event)" class="inset" disabled>
    </body>
    </html>

The *styles.css* file is shown below. It is NOT pretty, but it should work for demonstration purposes.

    .inset {
      box-shadow: inset 0 0 4px #000000;
      -moz-box-shadow: inset 0 0 4px #000000;
      -webkit-box-shadow: inset 0 0 4px #000000;
      border-width: 4px;
      width: 99%;
      padding: 5px;
    }
    input.inset {
      width: 100%;
    }
    div.inset {
      height: 90%;
      overflow: auto;
    }
    div.timestamp {
      width: 250px;
      float: left;
    }
    div.content {
      overflow: hidden;
      width: auto;
      border-left: 2px solid darkgreen;
      padding-left: 3px;
    }
    div.entry {
      border-bottom: 1px solid #cccccc;
    }

OK, we'll come back to the web content in a bit..

Next, we need a *chat.js* verticle to handle event bus messages from the client.

    /* global vertx */
    var eb = vertx.eventBus();

    // Receive message from the browser and then broadcast that message back out to all connected clients.
    eb.consumer("client.to.server").handler(function(message) {
      console.log("Message from client: "+message.body().content);
      var reply = message.body();
      var msgTime = new Date();
      reply["timestamp"] = msgTime.toLocaleDateString()+' '+msgTime.toLocaleTimeString();

      eb.publish("server.to.client", reply);
    });

    console.log("Chat verticle deployed.");

Next, let's add the event bus code to the *app.js* file which will be loaded into the HTML page.

    // Define *eb* (Event Bus) and *backoff* as globals
    var eb = {};
    var backoff = 0;
    
    // This function will initialize the event bus and set up all of our event handlers.
    function initEventBus() {
      console.log("Attempting to connect to the eventbus.");

      // Create an instance of the Vert.x event bus. The path should match the path defined in the router
      // inside of *webserver.js* (minus the trailing asterisk).
      eb = new vertx.EventBus("/eventbus/");

      // Once the event bus connection is established, enable the form input field and register a listener for server
      // messages.
      eb.onopen = function () {
        console.log("Eventbus connected.");
        
        // Reset the *backoff* to 0
        backoff = 0;
        
        // OK, event bus connected. Allow the user to type stuff into the input field.
        $('#input').prop('disabled', false);

        // Register listener for events coming from the server with new messages for the client.
        eb.registerHandler("server.to.client", function (msg) {
          console.log("Message from server: "+msg);
          var entry = '<div class="entry"><div class="timestamp">'+
                      msg.timestamp+': '+msg.user+'</div><div class="content">'+
                      msg.content+'</div></div>\n';
          $('#chat').append(entry);
          $('#chat').attr({ scrollTop: $("#chat").attr("scrollHeight") });
        });
      };

      // When the event bus connection closes, attempt to reconnect. If reconnect fails multiple times the reconnection
      // attempts get slower until it tries every 10 seconds. Also, disables the input form element to prevent typing.
      eb.onclose = function() {
        console.log("Eventbus connection lost.");
        $('#input').prop('disabled', true);
        if (backoff<10000) {
          backoff += 1000;
        }

        // Tell the browser to reconnect the eventbus in 'backoff' milliseconds.
        window.setTimeout(function() {
          initEventBus();
        }, backoff);
      };
    }

    // Initialize the event bus and event handlers.
    initEventBus();

    // Watch the input field for the 'ENTER' key and send messages when 'ENTER' is pressed.
    function keyUpEvent(event) {
      if (event.keyCode == 13 || event.which == 13) {
        var message = $('#input').val();
        if (message.length > 0) {
          var msg = {"content": message, "user": $('#name').val()};
          console.log(msg);
          eb.send("client.to.server", msg);
          $('#input').val("");
        }
      }
    }

In this JavaScript snippet, we are doing a few things:

1. We create a function to instantiate the event bus
2. Once the event bus connects, we register a consumer for the address which will receive messages from the server.
3. We create a function which will send a message to the server when the <CR> key is pressed.
4. We register a callback for if the event bus disconnects we will try to reconnect.

Whenever handling a message coming from the event bus, remember that you MUST call the “body()” method to actually get 
the message content. I used jQuery in this example, but there is an 
[AngularJS library](https://github.com/knalli/angular-vertxbus) for interfacing with Vert.x as well… The up side of the 
Angular library is that it supports automatic reconnection of the event bus bridge in case your service restarts or 
there is a connectivity issue.

That's it! You now have a chat application in Vert.x! The hardest code was on the client side for handling 
reconnections. You could launch this application from Maven using the command:

    mvn exec:java

You could also package the application and run it as a standalone application:

    mvn clean compile package
    java -jar target/codepalousa-vertx-chat-example-1.0-SNAPSHOT-fat.jar

The packaged JAR file should run anywhere you have Java 8 installed. If you need clustering, you just need to add the 
cluster flag. In some situations, you will have to customize the cluster.xml configuration to force clustering to choose
the appropriate network interface to do cluster communications on.

    java -jar target/codepalousa-vertx-chat-example-1.0-SNAPSHOT-fat.jar -cluster

Questions? Suggestions? Complaints? Improvements? Let me know!