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
    ETC_LOCATION="/etc/one/"
else
    VAR_LOCATION = ONE_LOCATION+"/var"
    LOG_LOCATION = ONE_LOCATION+"/var"
    RUBY_LIB_LOCATION = ONE_LOCATION+"/lib/ruby"
    ETC_LOCATION=ONE_LOCATION+"/etc/"
end

$: << RUBY_LIB_LOCATION
$: << File.dirname(__FILE__)

require 'models/OpenNebulaJSON'
include OpenNebulaJSON
require 'openssl'
require 'base64'

class SunstoneServer
    def initialize(username, password)
        # TBD one_client_user(name) from CloudServer
        @client = Client.new("dummy:dummy")
        @client.one_auth = "#{username}:#{password}"
    end
    
    def self.load_config (config=nil)   
        if (config == nil)          
	    default_hostkey = '/etc/grid-security/hostkey.pem'
	
	    auth_conf = ETC_LOCATION+'/auth/auth.conf'
		
	    if File.readable?(auth_conf)
                config_data=File.read(auth_conf)
	        config=YAML::load(config_data)
	        if !config[:hostkey]
                    config[:hostkey] = default_hostkey
                end
	    else
                default_config = ":hostkey: " + default_hostkey
                config=YAML.load(default_config)
	    end	
	end
	
	return config
    end

    ############################################################################
    #
    ############################################################################
    def self.authorize(user="", sha1_pass="", env="")
        failed = 'Authentication failed. '

        # TBD get_user_password(name) from CloudServer
        user_pool = UserPool.new(Client.new)
        rc = user_pool.info

        if OpenNebula.is_error?(rc)
            return [500, false]
        end

        # For https, the web service should be set to include the user cert in the environment.
	cert_line_in = env['HTTP_SSL_CLIENT_CERT']
   	
        if cert_line_in ==""
	    # Use the secret key for authentication.

            if user.empty? || sha1_pass.empty?
                return [401, false]
            end

            user_pass = user_pool["USER[NAME=\"#{user}\"]/PASSWORD"]
            if user_pass == sha1_pass
                return [204, user_pool["USER[NAME=\"#{user}\"]/ID"]]
            else
                return [401, nil]
            end

	else
        #  Use the https credentials for authentication

            # Get the DN from the certificate
            begin
                cert_array=cert_line_in.scan(/([^\s]*)\s/)
                cert_array = cert_array[2..-3]
                cert_array.unshift('-----BEGIN CERTIFICATE-----').push('-----END CERTIFICATE-----')
                user_cert = cert_array.join("\n")
                user_cert = OpenSSL::X509::Certificate.new(user_cert)
		subjectname = user_cert.subject.to_s
                subjectname_nosp = subjectname.gsub(/\s/, '')
            rescue
                return [401, failed + "Could not create X509 certificate from " + user_cert]
            end


            # Check that the DN corresponds to the password of a user
            begin
                username = user_pool["USER[PASSWORD=\"#{subjectname_nosp}\"]/NAME"]
	        if (username == nil)
	 
	            # Check if the DN is part of a |-separted multi-DN password
	            user_elts = Array.new
	            user_pool.each {|e| user_elts << e['PASSWORD']}
	            multiple_users = user_elts.select {|e| e=~ /\|/ }
	            matched = nil
	            multiple_users.each do |e|
	               e.to_s.split('|').each do |w|
	                   if (w == subjectname_nosp)
	                       matched=e
		               break
	                   end
	               end
	               break if matched
	            end
	            if matched
	                password = matched.to_s
	            end
                    username = user_pool["USER[PASSWORD=\"#{password}\"]/NAME"]
	        end	
            rescue
                return [401, failed + "User with DN " + subjectname + " not found."]
            end
	    
	    config = self.load_config
	    hostkey_path = config[:hostkey]

            # Sign the message and compose the special login token
            # Get the host private key
            begin
                host_cert = File.read(hostkey_path)
            rescue
                return [401, failed + "Could not read " + hostkey_path]
            end
	    
            begin
                host_cert_array=host_cert.split("\n")
                begin_lines=host_cert_array.select{|l| l.match(/BEGIN RSA PRIVATE KEY/)}
                begin_index=host_cert_array.index(begin_lines[0])
                begin_line=host_cert_array[begin_index].to_s

                end_lines=host_cert_array.select{|l| l.match(/END RSA PRIVATE KEY/)}
                end_index=host_cert_array.index(end_lines[0])
                end_line=host_cert_array[end_index].to_s

                host_key_array=host_cert_array[begin_index..end_index]
                private_key=host_key_array.join("\n")
            rescue
                return [401, failed + "Could not get private key from " + hostkey_path]
            end

            begin
                rsa=OpenSSL::PKey::RSA.new(private_key)
            rescue
                return [401, failed + "Could not create RSA key from " + hostkey_path]
            end

            # Sign with timestamp
            time=Time.now.to_i+7*24*3600
            text_to_sign="#{username}:#{subjectname}:#{time}"
            begin
                special_token=Base64::encode64(rsa.private_encrypt(text_to_sign)).gsub!(/\n/, '').strip
            rescue
                return [401, failed + "Could not create host-signed token for " + subjectname]
            end

            return [204, user_pool["USER[NAME=\"#{username}\"]/ID"], "#{username}", "host-signed:#{special_token}}"]
        end

    end    

    ############################################################################
    #
    ############################################################################
    def get_pool(kind)
        user_flag = -2
        pool = case kind
            when "cluster"  then ClusterPoolJSON.new(@client)
            when "host"     then HostPoolJSON.new(@client)
            when "image"    then ImagePoolJSON.new(@client, user_flag)
            when "template" then TemplatePoolJSON.new(@client, user_flag)
            when "vm"       then VirtualMachinePoolJSON.new(@client, user_flag)
            when "vnet"     then VirtualNetworkPoolJSON.new(@client, user_flag)
            when "user"     then UserPoolJSON.new(@client)
            else
                error = Error.new("Error: #{kind} resource not supported")
                return [404, error.to_json]
        end

        rc = pool.info
        if OpenNebula.is_error?(rc)
            return [500, rc.to_json]
        else
            return [200, pool.to_json]
        end
    end

    ############################################################################
    #
    ############################################################################
    def get_resource(kind, id)
        resource = retrieve_resource(kind, id)
        if OpenNebula.is_error?(resource)
            return [404, resource.to_json]
        else
            return [200, resource.to_json]
        end
    end

    ############################################################################
    #
    ############################################################################
    def create_resource(kind, template)
        resource = case kind
            when "cluster"  then ClusterJSON.new(Cluster.build_xml, @client)
            when "host"     then HostJSON.new(Host.build_xml, @client)
            when "image"    then ImageJSON.new(Image.build_xml, @client)
            when "template" then TemplateJSON.new(Template.build_xml, @client)
            when "vm"       then VirtualMachineJSON.new(VirtualMachine.build_xml,@client)
            when "vnet"     then VirtualNetworkJSON.new(VirtualNetwork.build_xml, @client)
            when "user"     then UserJSON.new(User.build_xml, @client)
            else
                error = Error.new("Error: #{kind} resource not supported")
                return [404, error.to_json]
        end

        rc = resource.create(template)
        if OpenNebula.is_error?(rc)
            return [500, rc.to_json]
        else
            resource.info
            return [201, resource.to_json]
        end
    end

    ############################################################################
    #
    ############################################################################
    def delete_resource(kind, id)
        resource = retrieve_resource(kind, id)
        if OpenNebula.is_error?(resource)
            return [404, resource.to_json]
        end

        rc = resource.delete
        if OpenNebula.is_error?(rc)
            return [500, rc.to_json]
        else
            return [204, resource.to_json]
        end
    end

    ############################################################################
    #
    ############################################################################
    def perform_action(kind, id, action_json)
        resource = retrieve_resource(kind, id)
        if OpenNebula.is_error?(resource)
            return [404, resource.to_json]
        end

        rc = resource.perform_action(action_json)
        if OpenNebula.is_error?(rc)
            return [500, rc.to_json]
        else
            return [204, resource.to_json]
        end
    end

    ############################################################################
    #
    ############################################################################
    def get_configuration(user_id)
        if user_id != "0"
            return [401, ""]
        end

        one_config = VAR_LOCATION + "/config"
        config = Hash.new

        begin
            cfg = File.read(one_config)
        rescue Exception => e
            error = Error.new("Error reading config: #{e.inspect}")
            return [500, error.to_json]
        end

        cfg.lines do |line|
            m=line.match(/^([^=]+)=(.*)$/)

            if m
                name=m[1].strip.upcase
                value=m[2].strip
                config[name]=value
            end
        end

        return [200, config.to_json]
    end

    ############################################################################
    #
    ############################################################################
    def get_vm_log(id)
        resource = retrieve_resource("vm", id)
        if OpenNebula.is_error?(resource)
            return [404, nil]
        else
            if !ONE_LOCATION
                vm_log_file = LOG_LOCATION + "/#{id}.log"
            else
                vm_log_file = LOG_LOCATION + "/#{id}/vm.log"
            end

            begin
                log = File.read(vm_log_file)
            rescue Exception => e
                return [200, "Log for VM #{id} not available"]
            end

            return [200, log]
        end
    end

    private

    def retrieve_resource(kind, id)
        resource = case kind
            when "cluster"  then ClusterJSON.new_with_id(id, @client)
            when "host"     then HostJSON.new_with_id(id, @client)
            when "image"    then ImageJSON.new_with_id(id, @client)
            when "template" then TemplateJSON.new_with_id(id, @client)
            when "vm"       then VirtualMachineJSON.new_with_id(id, @client)
            when "vnet"     then VirtualNetworkJSON.new_with_id(id, @client)
            when "user"     then UserJSON.new_with_id(id, @client)
            else
                error = Error.new("Error: #{kind} resource not supported")
                return error
        end

        rc = resource.info
        if OpenNebula.is_error?(rc)
            return rc
        else
            return resource
        end
    end
end
