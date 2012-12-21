require 'em-websocket'

EventMachine.run {
  @connectedPeers = Array.new

  EventMachine::WebSocket.start(:host => "192.168.15.205", :port => 8080, :debug => true) do |ws|

    ws.onopen {
      ws.send("authorize!")
      @connectedPeers.push ws
    }

    ws.onmessage { |msg|
      @connectedPeers.each { |peer|
        peer.send msg
      }
    }

    ws.onclose {
      @connectedPeers.delete ws
    }

  end

  puts "SuperPeer started"
}