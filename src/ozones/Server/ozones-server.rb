#!/usr/bin/env ruby

# -------------------------------------------------------------------------- #
# Copyright 2002-2011, OpenNebula Project Leads (OpenNebula.org)             #
#                                                                            #
# Licensed under the Apache License, Version 2.0 (the "License"); you may    #
# not use this file except in compliance with the License. You may obtain    #
# a copy of the License at                                                   #
#                                                                            #
# http://www.apache.org/licenses/LICENSE-2.0                                 #
#                                                                            #
# Unless required by applicable law or agreed to in writing, software        #
# distributed under the License is distributed on an "AS IS" BASIS,          #
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.   #
# See the License for the specific language governing permissions and        #
# limitations under the License.                                             #
#--------------------------------------------------------------------------- #

if !ENV['ONE_LOCATION']
    puts "ONE_LOCATION not found."
    exit 1
end

ONE_LOCATION=ENV["ONE_LOCATION"]

if !ONE_LOCATION
    RUBY_LIB_LOCATION="/usr/lib/one/ruby"
else
    RUBY_LIB_LOCATION=ONE_LOCATION+"/lib/ruby"
end


OZONES_LOCATION = ENV['ONE_LOCATION'] + "/lib/ozones/Server"
ENV['OZONES_LOCATION']=OZONES_LOCATION

$: << ENV['ONE_LOCATION'] + "/lib/sunstone/models"
$: << File.dirname(__FILE__) + "../sunstone/models"
$: << RUBY_LIB_LOCATION
$: << File.dirname(__FILE__)+'/models'
$: << File.dirname(__FILE__)+'/lib'


##############################################################################
# Required libraries
##############################################################################
require 'rubygems'
require 'sinatra'

require 'yaml'
require 'rubygems'
require 'data_mapper'
require 'digest/sha1'
require 'OzonesServer'

##############################################################################
# Read configuration
##############################################################################
begin
    config_data=File.read(ONE_LOCATION+'/etc/ozones-server.conf')
rescue 
    config_data=File.read(File.dirname(__FILE__)+'/etc/ozones-server.conf')
end

config=YAML::load(config_data)

db_type = config[:databasetype]
db_name = config[:databasename]
db_url = db_type + "://" + ONE_LOCATION + "/var/" + db_name

##############################################################################
# DB bootstrapping
##############################################################################
if config[:dbdebug] 
    DataMapper::Logger.new($stdout, :debug)
end

DataMapper.setup(:default, db_url)

require 'OZones'
require 'Auth'

DataMapper.finalize
DataMapper.auto_upgrade!

if Auth.all.size == 0
    if ENV['OZONES_AUTH'] && File.exist?(ENV['OZONES_AUTH'])
         credentials = IO.read(ENV['OZONES_AUTH']).strip.split(':')

         if credentials.length < 2
             warn "Authorization data malformed"
             exit -1
         end
         credentials[1] = Digest::SHA1.hexdigest(credentials[1])
         @auth=Auth.create({:name => credentials[0], 
                            :password => credentials[1]})
         @auth.save
    else
        warn "oZones admin credentials not set, missing OZONES_AUTH file."
        exit -1
    end
else
   @auth=Auth.all.first
end

ADMIN_NAME = @auth.name
ADMIN_PASS = @auth.password


##############################################################################
# Sinatra Configuration
##############################################################################
#use Rack::Session::Pool
set :host, config[:host]
set :port, config[:port]
set :show_exceptions, false

##############################################################################
# Helpers
##############################################################################
helpers do
    def authorized?        
        http_auth = Rack::Auth::Basic::Request.new(request.env)
        if http_auth.provided? && http_auth.basic? && http_auth.credentials
            user      = http_auth.credentials[0]
            sha1_pass = Digest::SHA1.hexdigest(http_auth.credentials[1])
            if user == ADMIN_NAME && sha1_pass == ADMIN_PASS
                return true
            end
        end
        
        false
    end

end

before do
    unless request.path=='/login' || request.path=='/'
        halt 401 unless authorized?
        
        @OzonesServer = OzonesServer.new  
        @pr = OZones::ProxyRules.new("apache",config[:htaccess])
    end
end

after do

end

##############################################################################
# HTML Requests
##############################################################################
get '/' do
    File.read(File.dirname(__FILE__)+'/templates/index.html')
end

get '/login' do
    "Nothing here, move along TODO TODO TODO TODO"
end

##############################################################################
# Login
##############################################################################
post '/login' do
end

post '/logout' do
end

##############################################################################
# Config and Logs
##############################################################################
get '/config' do
    config
end

##############################################################################
# GET Pool information
##############################################################################
get '/:pool' do
    @OzonesServer.get_pool(params[:pool])
end

##############################################################################
# GET Resource information
##############################################################################
get %r{/(zone|vdc)/(\d+)/(\w+)} do |kind, id, aggpool|
    @OzonesServer.get_full_resource(kind,id,aggpool)
end

get %r{/(zone|vdc)/(\d+)} do |kind, id|
    @OzonesServer.get_resource(kind,id)
end

get '/:pool/:aggpool' do
    @OzonesServer.get_aggregated_pool(params[:pool], params[:aggpool])
end



##############################################################################
# Delete Resource
##############################################################################
delete '/:resource/:id' do
    @OzonesServer.delete_resource(params[:resource], params[:id], @pr)
end

##############################################################################
# Create a new Resource
##############################################################################
post '/:pool' do
    @OzonesServer.create_resource(params[:pool], params, @pr)
end



