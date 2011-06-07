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

$: << RUBY_LIB_LOCATION
$: << OZONES_LOCATION + "/lib"
$: << OZONES_LOCATION + "/models"

##############################################################################
# Required libraries
##############################################################################
require 'rubygems'
require 'sinatra'

require 'yaml'
require 'rubygems'
require 'data_mapper'
require 'OzonesServer'

##############################################################################
# Read configuration
##############################################################################
config_data=File.read(ONE_LOCATION+'/etc/ozones.conf')
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

DataMapper.finalize
DataMapper.auto_upgrade!

##############################################################################
# Sinatra Configuration
##############################################################################
use Rack::Session::Pool
set :host, config[:host]
set :port, config[:port]

##############################################################################
# Helpers
##############################################################################
helpers do
    def authorized?
        #session[:ip] && session[:ip]==request.ip ? true : false
        true
    end

    def build_session
        auth = Rack::Auth::Basic::Request.new(request.env)
        if auth.provided? && auth.basic? && auth.credentials
            user = auth.credentials[0]
            sha1_pass = Digest::SHA1.hexdigest(auth.credentials[1])

            # TODO hacer autorizacion
            rc = 1 # SunstoneServer.authorize(user, sha1_pass)
            if rc[1]
                session[:user]     = user
                session[:user_id]  = rc[1]
                session[:password] = sha1_pass
                session[:ip]       = request.ip
                session[:remember] = params[:remember]

                if params[:remember]
                    env['rack.session.options'][:expire_after] = 30*60*60*24
                end

                return [204, ""]
            else
                return [rc.first, ""]
            end
        end

        return [401, ""]
    end

    def destroy_session
        session.clear
        return [204, ""]
    end
end

before do
    unless request.path=='/login' || request.path=='/'
        halt 401 unless authorized?
        
        @OzonesServer = OzonesServer.new
        
        @pr = OZones::ProxyRules.new("apache",config[:htaccess])
        @pr.update # Write proxy configuration file
    end
end

after do
    unless request.path=='/login' || request.path=='/'
        unless session[:remember]
            if params[:timeout] == true
                env['rack.session.options'][:defer] = true
            else
                env['rack.session.options'][:expire_after] = 60*10
            end
        end
    end
end

##############################################################################
# HTML Requests
##############################################################################
get '/' do
    # TODO auth framework
    # redirect '/login' unless authorized?

    time = Time.now + 60
    response.set_cookie("one-user",
                        :value=>"#{session[:user]}",
                        :expires=>time)
    response.set_cookie("one-user_id",
                        :value=>"#{session[:user_id]}",
                        :expires=>time)

    #File.read(File.dirname(__FILE__)+'/templates/index.html')
    "Nothing YET TODO TODO"
end

get '/login' do
    "Nothing here, move along TODO TODO TODO TODO"
end

##############################################################################
# Login
##############################################################################
post '/login' do
    build_session
end

post '/logout' do
    destroy_session
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
get '/:resource/:id' do
    @OzonesServer.get_resource(params[:resource], params[:id])
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



