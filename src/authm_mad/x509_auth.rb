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

require 'openssl'
require 'base64'
require 'fileutils'

# X509 authentication class. It can be used as a driver for auth_mad
# as auth method is defined. It also holds some helper methods to be used
# by oneauth command
class X509Auth

# Client side
    
    # Creates the login file for x509 authentication at ~/.one/one_x509.
    # By default it is valid for 1 hour but it can be changed to any number
    # of seconds with expire parameter (in seconds)
    def login(user, expire=3600)
        # Read the proxy file
        proxy_cert=get_x509_proxy_file
	
	# Get the proxy certificate	
 	proxy_cert_array=proxy_cert.split("\n")
 	begin_lines=proxy_cert_array.select{|l| l.match(/BEGIN CERTIFICATE/)}
 	begin_index=proxy_cert_array.index(begin_lines[0])
 	begin_line=proxy_cert_array[begin_index].to_s

 	end_lines=proxy_cert_array.select{|l| l.match(/END CERTIFICATE/)}
 	end_index=proxy_cert_array.index(end_lines[0])
 	end_line=proxy_cert_array[end_index].to_s

 	proxy_cert_line=proxy_cert_array[begin_index+1...end_index].join('')
	proxy_cert_array=proxy_cert_array[end_index+1..-1]
	

        # Get the proxy private key
 	begin_lines=proxy_cert_array.select{|l| l.match(/BEGIN RSA PRIVATE KEY/)}
 	begin_index=proxy_cert_array.index(begin_lines[0])
 	begin_line=proxy_cert_array[begin_index].to_s

 	end_lines=proxy_cert_array.select{|l| l.match(/END RSA PRIVATE KEY/)}
 	end_index=proxy_cert_array.index(end_lines[0])
 	end_line=proxy_cert_array[end_index].to_s

 	proxy_key_array=proxy_cert_array[begin_index..end_index]
	

        # Get the user certificate
 	begin_lines=proxy_cert_array.select{|l| l.match(/BEGIN CERTIFICATE/)}
        if begin_lines.length == 0   # No user cert -this is not a proxy
            user_cert_line = proxy_cert_line
            proxy_cert_line = ""
        else
 	    begin_index=proxy_cert_array.index(begin_lines[0])
 	    begin_line=proxy_cert_array[begin_index].to_s

 	    end_lines=proxy_cert_array.select{|l| l.match(/END CERTIFICATE/)}
 	    end_index=proxy_cert_array.index(end_lines[0])
 	    end_line=proxy_cert_array[end_index].to_s

 	    user_cert_line=proxy_cert_array[begin_index+1...end_index].join('')
        end	
	
	# Sign the message and compose the login token
        time=Time.now.to_i+expire
        text_to_sign="#{user}:#{time}"
 	proxy_key=proxy_key_array.join("\n")	
        signed_text=encrypt(text_to_sign, proxy_key)	
	sig_and_certs="#{signed_text}:#{proxy_cert_line}:#{user_cert_line}"	
	login_token=Base64::encode64(sig_and_certs).strip.delete!("\n")

	
	# Write the login file
        one_proxy="#{user}:plain:#{login_token}"
        file=get_one_proxy_file
        file.write(one_proxy)
        file.close
 
        
        # Help string
        puts "export ONE_AUTH=#{ENV['HOME']}/.one/one_x509"
        
        login_token
    end
    
       
    # Reads proxy file from specified or /tmp directory
    def get_x509_proxy_file
        path=ENV['X509_PROXY_CERT']
        File.read(path)
    end

    
    # Encrypts data with the private key and returns
    # base 64 encoded output
    def encrypt(data, priv_key)        
        rsa=OpenSSL::PKey::RSA.new(priv_key)
        # base 64 output is joined into a single line as opennebula
        # ascii protocol ends messages with newline
        Base64::encode64(rsa.private_encrypt(data)).gsub!(/\n/, '').strip
    end

    
    # Returns an opened file object to ~/.one/one_x509
    def get_one_proxy_file
        one_proxy_dir=ENV['HOME']+'/.one'
        
        # Creates ~/.one directory if it does not exist
        begin
            FileUtils.mkdir_p(one_proxy_dir)
        rescue Errno::EEXIST
        end
        
        File.open(one_proxy_dir+'/one_x509', "w")
    end
    
    
    def load_config
         
	default_hostcert = '/etc/grid-security/hostcert.pem'
	default_hostkey = '/etc/grid-security/hostkey.pem'
	default_ca_directory = '/etc/grid-security/certificates'
	
	auth_conf = ETC_LOCATION+'/auth/auth.conf'
		
	if File.readable?(auth_conf)
            config_data=File.read(auth_conf)
	    config=YAML::load(config_data)
            if !config[:hostcert]
                config[:hostcert] = default_hostcert
            end
	    if !config[:hostkey]
                config[:hostkey] = default_hostkey
            end
	    if !config[:ca_directory]
                config[:ca_directory] = default_ca_directory
            end
	else
            default_config = \
                ":hostcert: " + default_hostcert  + "\n" + \
                ":hostkey: " + default_hostkey + "\n" + \
                ":ca_directory: " + default_ca_directory
            config=YAML.load(default_config)
	end	
	
	return config
    end
    
    # Creates the login file for x509 authentication using the host certificate.
    # By default it is valid forever, but can be give an expiration as an option.
    def host_login(login_file='', expire=0, username='admin')
            failed = 'Creation of login failed. '
    
            # Read the locations of the host credentials from the config file.
            config = load_config
	    hostcert_path = config[:hostcert]
	    hostkey_path = config[:hostkey]
	    
            # Get the host private key
	    begin
 	        host_key = File.read(hostkey_path)
	    rescue
 	        raise failed + "Could not read " + hostkey_path
 	    end
	    begin
                host_key_array=host_key.split("\n")
                begin_lines=host_key_array.select{|l| l.match(/BEGIN RSA PRIVATE KEY/)}
                begin_index=host_key_array.index(begin_lines[0])
                begin_line=host_key_array[begin_index].to_s

                end_lines=host_key_array.select{|l| l.match(/END RSA PRIVATE KEY/)}
                end_index=host_key_array.index(end_lines[0])
                end_line=host_key_array[end_index].to_s

                host_key_array_part=host_key_array[begin_index..end_index]
                private_key=host_key_array_part.join("\n")
 	    rescue
 	        raise failed + "Could not get private key from " + hostkey_path
 	    end

	    begin
	        rsa=OpenSSL::PKey::RSA.new(private_key)
	    rescue
	        raise failed + "Could not create RSA key from " + hostkey_path
	    end
	    
	    # Read the host public certificate
	    begin
 	        host_cert = File.read(hostcert_path)
	    rescue
 	        raise failed + "Could not read " + hostcert_path
 	    end
	    
	    # Get host subject name (to be used as password after decryption)
	    begin
	        cert = OpenSSL::X509::Certificate.new(host_cert)
		encrypted_DN = Base64::encode64(rsa.private_encrypt(cert.subject.to_s)).gsub!(/\n/, '').strip
	        password  = Digest::SHA1.hexdigest(encrypted_DN)
	    rescue
	        raise failed + "Could not create certificate from " + hostkey_path
	    end
	    
	    # Set expiration time
	    if expire == 0
	        time = 0
            else	    
                time=Time.now.to_i+expire
	    end
	    
	    # Sign with timestamp
            text_to_sign="#{username}:#{password}:#{time}"		
	    begin
                special_token=Base64::encode64(rsa.private_encrypt(text_to_sign)).gsub!(/\n/, '').strip		
            rescue
	        raise failed + "Could not create host-signed token for " + password
	    end    
	    
	    # Write the login file
            one_proxy="#{username}:plain:host-signed:#{special_token}"
	    if login_file == ''
                file=get_one_proxy_file
	    else
	        begin
	            file=File.open(login_file, "w")
		rescue
		    raise failed + "Could not open " + login_file + " for writing."	
		end
	    end
	    file.chmod(0660)
            file.write(one_proxy)
            file.close
        
            # Help string
	    puts "Set admin password to " + password + " using -n option, then"
	    puts "make sure AUTH_MAD and USE_AUTH_MAD_FOR_ADMIN are set in oned.conf"
	    puts "(may need to start oned server), then"
            puts "export ONE_AUTH=" + file.path	    
	
    end
    
    
# Server side    
    # auth method for auth_mad
    def auth(user_id, user, dn, login_token)        
        begin
	    failed = 'Authentication failed. '
	    
	    # Read the locations of the host credentials from the config file.
            config = load_config
	    hostcert_path = config[:hostcert]
	    hostkey_path = config[:hostkey]
            ca_directory = config[:ca_directory]
	    		    	    
	    special_tag, special_token = login_token.split(':')	 
	    if special_tag == "host-signed"
		
		# Get the host public certificate
		begin
		    cert = OpenSSL::X509::Certificate.new(File.read(hostcert_path))
		rescue
		    raise failed + "Could not open file " + hostcert_path
		end
	        public_key = extract_public_key(cert)				
		# Decrypt the signed text with the public key
                decrypted=decrypt(special_token, public_key)      
                username, subjn_digest, time, last =decrypted.split(':')	
                if last # There was a : in the subjectname, from kerberos X509 credential
                    subjectname = subjectname + ':' + time
                    time = last
                end
	    
	        # Check the expiration, username, and password
		# Host can specify no expiration by setting time=0
		if time.to_i != 0
	            now=Time.now          		           
                    raise "Login credential expired at " + Time.at(time.to_i).to_s + 
	                ". Current time is " + now.localtime.to_s + "." if now.to_i>time.to_i	           
		end
		
		# Check the username
                raise "Login name " + username + " did not match username " + user + "." if user!=username
		
		# The user is authorized if their subject name has been set as their password.
		if  user_id.to_i == 0
		    dn_digest = dn
		else
		    # Compare digests. A digest is used instead of a plain DN because
		    # it may not be possible to encrypt many '|'-separated DNs
		    dn_digest = Digest::SHA1.hexdigest(dn)
		end

	        raise "Login DN hash " + subjn_digest + " did not match hash of user DN " + dn + ", which was " + dn_digest if subjn_digest!=dn_digest
		
	        true    
	    else
	    
	        # Parse the login message
	        token=Base64::decode64(login_token)
	        signed_text, proxy_cert_line, user_cert_line = token.split(':')

                # Extract the proxy certificate
                if proxy_cert_line != ""
                    proxy_cert = get_cert(proxy_cert_line)
	            proxy_cert = OpenSSL::X509::Certificate.new(proxy_cert)
                else
                    proxy_cert = nil
                end


                # Extract the user certificate
	        user_cert = get_cert(user_cert_line)
	        user_cert = OpenSSL::X509::Certificate.new(user_cert)
                subject_name = user_cert.subject.to_s
	        failed = "Authentication failed for " + subject_name + "."

	        dn_ok =  dn.split('|').include?(subject_name.gsub(/\s/, ''))
	        if dn_ok
	        ok = "true"
	        else
	        ok = "false"
	        end
                #raise ok

	        # Check that the user's DN has been added to the users database
                unless dn_ok
	            raise "User " + subject_name + " is not mapped in the user database. " +  dn
                end

                # Extract the public key
                if proxy_cert.nil?
         	    public_key = extract_public_key(user_cert)
	        else
                    public_key = extract_public_key(proxy_cert)
                end

	    	    
	        # Decrypt the signed text with the public key
                decrypted=decrypt(signed_text, public_key)       
                username, time=decrypted.split(':')	    	    

	    
	        # Check the expiration and user name 
	        now=Time.now          		           
                raise "Login credential expired at " + Time.at(time.to_i).to_s + 
	            ". Current time is " + now.localtime.to_s + "." if now.to_i>time.to_i	           
                raise "Login name " + username + " did not match username " + user + "." if user!=username
	    	   
 
	        # Validate the certificate chain of the proxy
	        validated = validate_chain(proxy_cert, user_cert, ca_directory)	    
                raise "Could not validate certificate chain." if not validated
	       
	        true
	    end
        rescue
            failed + "Error in x509 auth method. " + $!
        end
    end
    
        
    # Decrypts base 64 encoded data with pub_key (public key)
    def decrypt(data, public_key)

	begin
	    rsa=OpenSSL::PKey::RSA.new(Base64::decode64(public_key))
            rsa.public_decrypt(Base64::decode64(data))
	rescue
            raise "Could not decrypt signed text."
        end
    end

    
    # Gets a multi-line version of the one-line certificate
    def get_cert(cert_line)
        cert_array=cert_line.scan(/.{64}/)
	lastline = cert_line[cert_array.length*64..-1]
        cert_array.push(lastline) if lastline.length > 0
        cert_array.unshift('-----BEGIN CERTIFICATE-----').push('-----END CERTIFICATE-----')
        cert=cert_array.join("\n")
	cert
    end

    
    # Gets the public key from the certificate.
    def extract_public_key(cert)
	# gets rid of "---- BEGIN/END RSA PUBLIC KEY ----" lines and joins result into a single line
        public_key = cert.public_key.to_s.split("\n").reject {|l| l.match(/RSA PUBLIC KEY/) }.join('')
	public_key
    end

    
    # Validates the the certificate chain
    def validate_chain(proxy, user, ca_directory)
        failed="Error in x509 validate_chain method. "

        # Check start time of proxy or user cert
 	now=Time.now
        if proxy.nil?
            not_before = user.not_before
        else
            not_before = proxy.not_before 
        end
        before_ok = not_before<now
 	if !before_ok
 	    raise failed + "Cert not valid before " + not_before.localtime.to_s + 
	        ". Current time is " + now.localtime.to_s + "."
 	end

 	
	# Check end time of proxy
        if proxy.nil?  
            not_after = user.not_after
        else  
            not_after = proxy.not_after
        end
 	after_ok=not_after>now
 	if !after_ok
 	    raise failed + "Cert not valid after " + not_after.localtime.to_s + 
	        ". Current time is " + now.localtime.to_s + "."
 	end

 	
	# Check that the issuer of the proxy is the same user as in the user certificate
        is_proxy=!(proxy.nil?)
        if is_proxy
 	    issuer_ok=proxy.issuer.to_s==user.subject.to_s
 	    if !issuer_ok
 	        raise failed + "Proxy with issuer " + proxy.issuer.to_s + " does not match user " + user.subject.to_s + "."
 	    end
        end

 	
	# Check that the user signed the proxy
 	verified=!is_proxy||proxy.verify(user.public_key)
 	if !verified
 	   #proxy_hash = proxy.subject.hash.to_s(16)
 	   #user_hash = user.subject.hash.to_s(16)
 	   ##puts  "%8s"%proxy_hash + " was signed by " + "%8s"%user_hash + " ("+user.subject.to_s+")"
 	#else
 	   raise failed + "Proxy with issuer " + proxy.subject.to_s + " was not verified by " + user.subject.to_s + "."
 	end

 	
 	# Check the rest of the certificate chain
 	signee=user
 	begin
 	   ca_hash = signee.issuer.hash.to_s(16)
 	   begin
 	       ca = OpenSSL::X509::Certificate.new(File.read(ca_directory+'/'+ca_hash+'.0'))
 	   rescue
 	       raise failed + "Could not open file " + ca_directory+'/'+ca_hash+'.0' + "."
 	   end
 	   verified = signee.issuer.to_s==ca.subject.to_s and signee.verify(ca.public_key)
 	   if verified
               #puts  "%8s"%signee.subject.hash.to_s(16) + " was signed by " + "%8s"%ca_hash + " ("+ca.subject.to_s+")"
 	       signee=ca
 	   else
 	       raise failed + signee.subject.to_s + " with issuer " + signee.issuer.to_s + " was not verified by " + ca.subject.to_s + "."
 	   end
 	end while ca.subject.to_s!=ca.issuer.to_s


 	#puts  ca.subject.hash.to_s(16) + " was issued by " + ca.issuer.hash.to_s(16) if verified  
 	 
	true   
    end
	
end 	
