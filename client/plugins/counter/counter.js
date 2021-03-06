(function() {
  window.plugins.counter = {
    bind: function(div, item) {},
    emit: function(div, item) {
      var print, socket;
      socket = new WebSocket('ws://' + window.document.location.host + '/system/counter');
      print = function(m) {
        return div.append($("<li>").html(m));
      };
      socket.onopen = function() {
        return print("WebSocket Connection Opened.");
      };
      socket.onmessage = function(e) {
        return print(e.data);
      };
      return socket.onclose = function() {
        return print("WebSocket Connection Closed.");
      };
    }
  };

}).call(this);
