require 'json'
require 'logger'

class DocumentManager 
  def initialize directory, logger
    @documents = Array.new
    @directory = directory
    @logger = logger
    if File.directory? @directory+"documents"
      prefLength = @directory.length + 10
      tempDocs = Dir.glob @directory+"documents/*.pwd"
      tempDocs.each do |docPath|
        if docPath.end_with? ".pwd"
          @documents.push docPath[prefLength,40]
        end
      end
    else
      Dir.mkdir @directory+"documents"
    end
  end
  
  def hasFile? id
    @logger.debug @documents.to_s
    return @documents.include? id
  end
  
  def getFile id
    content = nil
    if self.hasFile? id
      file = nil
      begin
        file = File.new @directory+"documents/"+id+".pwd"
        content = file.read
        content = JSON.parse! content
      rescue => error
        @logger.error "Error while reading File: "+error.backtrace
      ensure
        file.close
      end
    end
    return content
  end
  
  def saveFile id, content
    file = nil
    begin
      file = File.new(@directory+"documents/"+id+".pwd", "w")
      json = JSON.generate content
      file.write json
      @documents.push id
    rescue => error
      @logger.error "Error while writing to File: "+error.backtrace
    ensure
      file.close
    end
  end
end