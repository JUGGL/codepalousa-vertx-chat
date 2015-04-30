var AsyncSqlService = require("vertx-mysql-postgresql-js/async_sql_service");

var proxy = AsyncSqlService.createEventBusProxy(vertx, "vertx.postgresql");

vertx.eventBus().consumer("store.message").handler(function(message) {
  proxy.getConnection(function(res, res_err) {
    if (res_err==null) {
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