var AsyncSqlService = require("vertx-mysql-postgresql-js/async_sql_service");

// Create a service proxy for the async database service.
// The actual DB service is deployed in main.js:17
var proxy = AsyncSqlService.createEventBusProxy(vertx, "vertx.postgresql");

/*
 * Register a consumer to recieve event bus messages for storing chat messages in a DB
 */
vertx.eventBus().consumer("store.message").handler(function(message) {
  
  // Tell the service proxy to initialized the DB connection
  proxy.getConnection(function(res, res_err) {
    if (res_err==null) {  // IF DB connection was successful, parse the query parameters and send a prepared statement.
      var conn = res;
      var params = message.body();
      console.log("Params: "+params);
      var backlog = "INSERT INTO messages (username, msgtime, content) VALUES (?, ?, ?);";
      conn.queryWithParams(backlog, params, function(dbres, dbres_err) {
        if (dbres_err==null) {
          console.log("Data inserted successfully.");
        } else {
          console.log("Error getting query results"+dbres_err);
        }
      });
    } else {
      console.log("Failed to get PostgreSQL DB proxy connection."+res_err);
    }
  });
});

console.log("Datastore verticle loaded.");