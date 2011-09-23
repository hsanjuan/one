#!/usr/bin/env ruby
# -*- coding: utf-8 -*-

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

ONE_LOCATION = ENV["ONE_LOCATION"]

if !ONE_LOCATION
    LOG_LOCATION = "/var/log/one"
    VAR_LOCATION = "/var/lib/one"
    RUBY_LIB_LOCATION = "/usr/lib/one/ruby"
    CONFIGURATION_FILE = "/etc/one/sunstone-server.conf"
    PLUGIN_CONFIGURATION_FILE = "/etc/one/sunstone-plugins.yaml"
else
    VAR_LOCATION = ONE_LOCATION+"/var"
    LOG_LOCATION = ONE_LOCATION+"/var"
    RUBY_LIB_LOCATION = ONE_LOCATION+"/lib/ruby"
    CONFIGURATION_FILE = ONE_LOCATION+"/etc/sunstone-server.conf"
    PLUGIN_CONFIGURATION_FILE = ONE_LOCATION+"/etc/sunstone-plugins.yaml"
end

SUNSTONE_ROOT_DIR = File.dirname(__FILE__)

$: << RUBY_LIB_LOCATION
$: << RUBY_LIB_LOCATION+'/cloud'
$: << SUNSTONE_ROOT_DIR+'/models'

##############################################################################
# Required libraries
##############################################################################
require 'rubygems'
require 'sinatra'
require 'erb'

require 'CloudAuth'
require 'SunstoneServer'
require 'SunstonePlugins'

begin
    conf = YAML.load_file(CONFIGURATION_FILE)
    conf[:hash_passwords] = true
rescue Exception => e
    puts "Error parsing config file #{CONFIGURATION_FILE}: #{e.message}"
    exit 1
end

##############################################################################
# Sinatra Configuration
##############################################################################
use Rack::Session::Pool, :key => 'sunstone'
set :config, conf
set :host, settings.config[:host]
set :port, settings.config[:port]

##############################################################################
# Helpers
##############################################################################
helpers do
    def authorized?
        session[:ip] && session[:ip]==request.ip ? true : false
    end

    def build_session
        cloud_auth = CloudAuth.new(settings.config)

        begin
            result = cloud_auth.auth(request.env, params)
        rescue Exception => e
            error 500, e.message
        end

        if result
            return [401, ""]
        else
            user_id = OpenNebula::User::SELF
            user    = OpenNebula::User.new_with_id(user_id, cloud_auth.client)

            rc = user.info
            if OpenNebula.is_error?(rc)
                # Add a log message
                return [500, ""]
            end

            session[:user]       = user['NAME']
            session[:user_id]    = user['ID']
            session[:user_gid]   = user['GID']
            session[:user_gname] = user['GNAME']
            session[:token]      = cloud_auth.token
            session[:ip]         = request.ip
            session[:remember]   = params[:remember]

            if params[:remember]
                env['rack.session.options'][:expire_after] = 30*60*60*24
            end

            return [204, ""]
        end
    end

    def destroy_session
        session.clear
        return [204, ""]
    end
end

before do
    unless request.path=='/login' || request.path=='/'
        halt 401 unless authorized?

        @SunstoneServer = SunstoneServer.new(
                                session[:token],
                                settings.config[:one_xmlrpc])
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
    if !authorized?
        templ = settings.config[:auth]=="basic"? "login.html" : "login_x509.html"
        return File.read(File.dirname(__FILE__)+'/templates/'+templ)
    end
    time = Time.now + 60
    response.set_cookie("one-user",
                        :value=>"#{session[:user]}",
                        :expires=>time)
    response.set_cookie("one-user_id",
                        :value=>"#{session[:user_id]}",
                        :expires=>time)
    response.set_cookie("one-user_gid",
                        :value=>"#{session[:user_gid]}",
                        :expires=>time)

    p = SunstonePlugins.new
    @plugins = p.authorized_plugins(session[:user], session[:user_gname])

    erb :index
end

get '/login' do
    if !authorized?
        templ = settings.confing[:auth]=="basic"? "login.html" : "login_x509.html"
        return File.read(File.dirname(__FILE__)+'/templates/'+templ)
    end
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
    @SunstoneServer.get_configuration(session[:user_id])
end

get '/vm/:id/log' do
    @SunstoneServer.get_vm_log(params[:id])
end

##############################################################################
# Logs
##############################################################################

get '/:resource/monitor' do
    @SunstoneServer.get_monitoring(
        nil,
        params[:resource],
        params[:monitor_resources],
        session[:user_gid])
end

get '/:resource/:id/monitor' do
    @SunstoneServer.get_monitoring(
        params[:id],
        params[:resource],
        params[:monitor_resources],
        session[:user_gid])
end


##############################################################################
# GET Pool information
##############################################################################
get '/:pool' do
    @SunstoneServer.get_pool(params[:pool],
                             session[:user_gid])
end

##############################################################################
# GET Resource information
##############################################################################

get '/:resource/:id/template' do
    @SunstoneServer.get_template(params[:resource], params[:id])
end

get '/:resource/:id' do
    @SunstoneServer.get_resource(params[:resource], params[:id])
end

##############################################################################
# Delete Resource
##############################################################################
delete '/:resource/:id' do
    @SunstoneServer.delete_resource(params[:resource], params[:id])
end

##############################################################################
# Create a new Resource
##############################################################################
post '/:pool' do
    @SunstoneServer.create_resource(params[:pool], request.body.read)
end

##############################################################################
# Stop the VNC Session of a target VM
##############################################################################
post '/vm/:id/stopvnc' do
    vm_id = params[:id]
    vnc_hash = session['vnc']

    if !vnc_hash || !vnc_hash[vm_id]
        msg = "It seems there is no VNC proxy running for this machine"
        return [403, OpenNebula::Error.new(msg).to_json]
    end

    rc = @SunstoneServer.stopvnc(vm_id, vnc_hash[vm_id][:pipe])
    if rc[0] == 200
        session['vnc'].delete(vm_id)
    end

    rc
end

##############################################################################
# Start a VNC Session for a target VM
##############################################################################
post '/vm/:id/startvnc' do
    vm_id = params[:id]

    vnc_hash = session['vnc']

    if !vnc_hash
        session['vnc']= {}
    elsif vnc_hash[vm_id]
        #return existing information
        info = vnc_hash[vm_id].clone
        info.delete(:pipe)

        return [200, info.to_json]
    end

    rc = @SunstoneServer.startvnc(vm_id, settings.config)
    if rc[0] == 200
        info = rc[1]
        session['vnc'][vm_id] = info.clone
        info.delete(:pipe)

        [200, info.to_json]
    else
        rc
    end
end

##############################################################################
# Perform an action on a Resource
##############################################################################
post '/:resource/:id/action' do
    @SunstoneServer.perform_action(params[:resource],
                                   params[:id],
                                   request.body.read)
end
