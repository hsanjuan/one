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

##############################################################################
# Required libraries
##############################################################################
require 'rubygems'
require 'sinatra'

require 'models/SunstoneServer'


##############################################################################
# Sinatra Configuration
##############################################################################
use Rack::Session::Pool


##############################################################################
# Helpers
##############################################################################
helpers do
    def authorized?
        session[:ip] && session[:ip]==request.ip ? true : false
    end

    def build_session

        auth = Rack::Auth::Basic::Request.new(request.env)

        if auth.provided? && auth.basic? && auth.credentials
            user = auth.credentials[0]
            sha1_pass = Digest::SHA1.hexdigest(auth.credentials[1])

            rc = SunstoneServer.authorize(user, sha1_pass, request.env)

            if rc[1]
                session[:user_id]  = rc[1]
                if rc[2]
                    session[:user]     = rc[2]
                else
                    session[:user]     = user
                end
                if rc[3]
                    session[:password] = rc[3]
                else
                    session[:password] = sha1_pass
                end
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

        @SunstoneServer = SunstoneServer.new(session[:user], session[:password])
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

    if authorized?
        time = Time.now + 60
        response.set_cookie("one-user",
                        :value=>"#{session[:user]}",
                        :expires=>time)
        response.set_cookie("one-user_id",
                        :value=>"#{session[:user_id]}",
                        :expires=>time)

        File.read(File.dirname(__FILE__)+'/templates/index.html')
    else
        cert_line_in = env['HTTP_SSL_CLIENT_CERT']
        if cert_line_in ==""
            redirect '/login'
        else
            encoded_login = ["dummy:dummy"].pack("m*")
            env['HTTP_AUTHORIZATION'] =  "Basic #{encoded_login}"
            rc = build_session
            if rc[0] == 204
                File.read(File.dirname(__FILE__)+'/templates/index.html')
            else
                redirect "https://#{request.host}:#{request.port}/login"
            end
        end
    end
end

get '/login' do
    File.read(File.dirname(__FILE__)+'/templates/login.html')
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
# GET Pool information
##############################################################################
get '/:pool' do
    @SunstoneServer.get_pool(params[:pool])
end

##############################################################################
# GET Resource information
##############################################################################
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
# Perform an action on a Resource
##############################################################################
post '/:resource/:id/action' do
    @SunstoneServer.perform_action(params[:resource], params[:id], request.body.read)
end

