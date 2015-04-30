var eb = {};
var backoff = 0;

function initEventBus() {
  console.log("Attempting to connect to the eventbus.");

  // Create an instance of the Vert.x event bus.
  eb = new vertx.EventBus("/eventbus/");

  // Once the event bus connection is established, enable the form input field and register a listener for server
  // messages.
  eb.onopen = function () {
    console.log("Eventbus connected.");
    backoff = 0;
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