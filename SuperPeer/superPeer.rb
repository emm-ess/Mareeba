#!/usr/bin/env ruby
require 'optparse'
require 'logger'
require 'em-websocket'
require 'json'
require_relative 'connection'
require_relative 'connectionManager'
require_relative 'publicMessageHandler'
require_relative 'documentManager'
require_relative 'messageHandler'
require_relative 'networkMessageHandler'
require_relative 'publicMessageHandler'

options = {}

optparse = OptionParser.new do |opts|
  opts.banner = "Usage: superPeer.rb --ip IP --port PORT"
  
  opts.on('-i', '--ip IP', 'IP of host') do |ip|
    options[:ip] = ip
  end
  
  opts.on('-n', '--host HOSTNAME', 'name of host') do |host|
    options[:host] = host
  end

  opts.on('-p', '--port PORT', Integer, 'port which will be used') do |port|
    options[:port] = port
  end

  options[:directory] = './'
  opts.on('-d', '--directory /PATH/TO/PEERWEB', String, 'path to peerweb') do |directory|
    options[:directory] = directory
  end

  options[:debug_em] = false
  opts.on('--debug-em', 'debug WebSocket Server') do
    options[:debug_em] = true
  end

  options[:debug] = false
  opts.on('-D', '--debug', '') do
    options[:debug] = true
  end

  opts.on('-h', '--help', 'Display this screen') do
    puts opts
    exit
  end
end

# check mandatory parameter
# taken from http://stackoverflow.com/questions/1541294/how-do-you-specify-a-required-switch-not-argument-with-ruby-optionparser
begin
  optparse.parse!
  mandatory = [:ip, :port]
  missing = mandatory.select{ |param| options[param].nil? }
  if not missing.empty?
    puts "Missing options: #{missing.join(', ')}"
    puts optparse
    exit
  end
rescue OptionParser::InvalidOption, OptionParser::MissingArgument
  puts $!.to_s
  puts optparse
  exit
end

if(!options[:host])
  options[:host] = options[:ip]
end


#Logging
if !File.directory? options[:directory]+"logs"
  Dir.mkdir options[:directory]+"logs"
end
@logger = Logger.new(options[:directory]+"logs/SuperPeer.log", 10, 1024000)
if(options[:debug])
  @logger.sev_threshold = Logger::DEBUG
else
  @logger.sev_threshold = Logger::INFO
end
@logger.datetime_format = "%Y-%m-%d %H:%M:%S"
@logger.formatter = proc do |severity, datetime, progname, msg|
  where = ""
  if(@logger.level == Logger::DEBUG)
    #more or less taken from https://code.google.com/p/logstash/source/browse/trunk/lib/logstash/logging.rb?spec=svn469&r=469
    path, line, method = caller[4].split(/(?::in `|:|')/)
    # Trim RUBYLIB path from 'file' if we can
    #whence = $:.select { |p| path.start_with?(p) }[0]
    whence = $:.detect { |p| path.start_with?(p) }
    if !whence
      # We get here if the path is not in $:
      file = path[options[:directory].length + 0..-1]
    else
      file = path[whence.length + 1..-1]
    end
    where = " #{file} #{line} #{method}"
  end
  "#{datetime}#{where} #{severity}: #{msg}\n"
end


class SuperPeer
  def initialize(id, host, port, directory, logger)
    @logger = logger
    @id = SecureRandom.hex 20
    @numID = Integer(@id, 16)
    @peerDesc = {
      "id" => @id,
      "ws" => "ws://"+host+":"+port.to_s
    }
    @msgHndl = MessageHandler.new(@id, @logger)
    @netMsgHndl = NetworkMessageHandler.new(@msgHndl, @id, @logger)
    @pubMsgHndl = PublicMessageHandler.new(@msgHndl, @id, @logger)
    @docMng = DocumentManager.new(directory, @logger)
    @conMng = ConnectionManager.new(@peerDesc, @logger)
    @msgHndl.setConnectionManager(@conMng)
    @netMsgHndl.setConnectionManager(@conMng)
    @pubMsgHndl.setDocumentManager(@docMng)
  end
  
  def description
    @peerDesc
  end
  
  def id
    @id
  end
  
  def getConMng
    @conMng
  end
  
  def getMsgHndl
    @msgHndl
  end
end

#start server
EventMachine.run do
  @superPeer = SuperPeer.new(options[:ip], options[:host], options[:port], options[:directory], @logger)
  @conMng = @superPeer.getConMng
  @msgHndl = @superPeer.getMsgHndl
  
  EventMachine::WebSocket.start(:host => options[:ip], :port => options[:port], :debug => options[:debug_em]) do |ws|

    connection = Connection.new(ws, @logger)
    
    ws.onopen {
      msg = ({:head => {:service => "network", :action => "peerDescription", :from => @superPeer.id}, :body => {:peerDescription => @superPeer.description}}).to_json
      # msg = JSON.generate msg
      ws.send msg
      @conMng.newConnection connection
    }

    ws.onmessage { |msg|
      @logger.info "msg recieved: "+msg
      msg = JSON.parse! msg
      @msgHndl.handleMessage(msg, connection)
    }

    ws.onclose {
      @conMng.connectionClosed connection
      ws = nil
      connection = nil
    }
    
    ws.onerror { |error|
      backtrace = ""
      if error.backtrace != nil
        backtrace = error.backtrace.join("\n")
      end
      @logger.error "Error in WebSocketConnection: #{error} \n"+backtrace
    }

  end

  @logger.info "SuperPeer started with ID: "+@superPeer.id+"\r\n"+
   "on Host: "+options[:host]+"\r\n"+
   "on Port: "+options[:port].to_s
end