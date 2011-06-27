/* -------------------------------------------------------------------------- */
/* Copyright 2002-2011, OpenNebula Project Leads (OpenNebula.org)             */
/*                                                                            */
/* Licensed under the Apache License, Version 2.0 (the "License"); you may    */
/* not use this file except in compliance with the License. You may obtain    */
/* a copy of the License at                                                   */
/*                                                                            */
/* http://www.apache.org/licenses/LICENSE-2.0                                 */
/*                                                                            */
/* Unless required by applicable law or agreed to in writing, software        */
/* distributed under the License is distributed on an "AS IS" BASIS,          */
/* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.   */
/* See the License for the specific language governing permissions and        */
/* limitations under the License.                                             */
/* -------------------------------------------------------------------------- */

var oZones = {

    "Error": function(resp)
    {
        var error = {};
        if (resp.responseText)
        {
            error = JSON.parse(resp.responseText);
        }
        else
        {
            error.error = {};
        }
        error.error.http_status = resp.status;
        return error;
    },

    "is_error": function(obj)
    {
        if (obj.error)
        {
            return true;
        }
        else
        {
            return false;
        }
    },

    "Helper": {
// TODO Are we going to use this ?? 
        "action": function(action, params)
        {
            obj = {
                "action": {
                    "perform": action
                }
            }
            if (params)
            {
                obj.action.params = params;
            }
            return obj;
        },
// END TODO

        "request": function(resource, method, data) {
            var r = {
                "request": {
                    "resource"  : resource,
                    "method"    : method
                }
            }
            if (data)
            {
                if (typeof(data) != "array")
                {
                    data = [data];
                }
                r.request.data = data;
            }
            return r;
        },

        "pool": function(kind, response)
        {
            var pool_name = resource + "pool";
            var pool;

            if (typeof(pool_name) == "undefined")
            {
                return Error('Incorrect Pool');
            }
            
            var p_pool = [];

            if (response[pool_name]) {
                pool = response[pool_name][type];
            } else { pull = null };

            if (pool == null)
            {
                return p_pool;
            }
            else if (pool.length)
            {
                for (i=0;i<pool.length;i++)
                {
                    p_pool[i]={};
                    p_pool[i][type]=pool[i];
                }
                return(p_pool);
            }
            else
            {
                p_pool[0] = {};
                p_pool[0][type] = pool;
                return(p_pool);
            }
        }
    },

    "Auth": {
        "resource": "AUTH",

        "login": function(params)
        {
            var callback = params.success;
            var callback_error = params.error;
            var username = params.data.username;
            var password = params.data.password;
            var remember = params.remember;

            var resource = OpenNebula.Auth.resource;            
            var request  = OpenNebula.Helper.request(resource,"login");

            $.ajax({
                url: "/login",
                type: "POST",
                data: {remember: remember},
                beforeSend : function(req) {
                    req.setRequestHeader( "Authorization",
                                        "Basic " + btoa(username + ":" + password)
                                        )
                },
                success: function(response)
                {
                    if (callback)
                    {
                        callback(request, response);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, OpenNebula.Error(response));
                    }
                }
            });
        },

        "logout": function(params)
        {
            var callback = params.success;
            var callback_error = params.error;

            var resource = OpenNebula.Auth.resource;
            var request = OpenNebula.Helper.request(resource,"logout");

            $.ajax({
                url: "/logout",
                type: "POST",
                success: function(response)
                {
                    if (callback)
                    {
                        callback(request, response);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, OpenNebula.Error(response));
                    }
                }
            });
        }
    },

    "Config": {
        "resource": "CONFIG",

        "list": function(params)
        {
            var callback = params.success;
            var callback_error = params.error;

            var resource = OpenNebula.Config.resource;
            var request = OpenNebula.Helper.request(resource,"list");

            $.ajax({
                url: "/config",
                type: "GET",
                dataType: "json",
                success: function(response)
                {
                    if (callback)
                    {
                        callback(request, response);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, OpenNebula.Error(response));
                    }
                }
            });
        }
    },

    "Zone": {
        "resource": "zone",

        "create": function(params)
        {
            var callback       = params.success;
            var callback_error = params.error;
            var data           = params.data;
            var resource       = oZones.Zone.resource;

            var request = oZones.Helper.request(resource,"create", data);

            $.ajax({
                url:  "/" + resource,
                type: "POST",
                dataType: "json",
                data: JSON.stringify(data),
                success: function(response)
                {
                    if (callback)
                    {
                        callback(request, response);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, oZones.Error(response));
                    }
                }
            });
        },

        "delete": function(params)
        {
            var callback       = params.success;
            var callback_error = params.error;
            var id             = params.data.id;
            var resource       = oZones.Zone.resource;


            var request = oZones.Helper.request(resource,"delete", id);

            $.ajax({
                url:  "/" + resource +"/" + id,
                type: "DELETE",
                success: function()
                {
                    if (callback)
                    {
                        callback(request);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, oZones.Error(response));
                    }
                }
            });
        },

        "list": function(params)
        {
            var callback       = params.success;
            var callback_error = params.error;
            var timeout        = params.timeout || false;

            var resource = oZones.Zone.resource;
            var request  = oZones.Helper.request(resource,"list");

            $.ajax({
                url:  "/" + resource,
                type: "GET",
                data: {timeout: timeout},
                dataType: "json",
                success: function(response)
                {
                    if (callback)
                    {
                        var host_pool = oZones.Helper.pool(resource,response);
                        callback(request, zone_pool);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, oZones.Error(response));
                    }
                }
            });
        },

        "show": function(params)
        {

            var callback       = params.success;
            var callback_error = params.error;
            var id             = params.data.id;

            var resource = oZones.Zone.resource;
            var request  = oZones.Helper.request(resource,"show", id);

            $.ajax({
                url: "/" + resource +"/" + id,
                type: "GET",
                dataType: "json",
                success: function(response)
                {
                    if (callback)
                    {
                        callback(request, response);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, oZones.Error(response));
                    }
                }
            });
        },
        
        "host": function(params)
        {

            var callback       = params.success;
            var callback_error = params.error;
            var id             = params.data.id;

            var resource = oZones.Zone.resource;
            var request  = oZones.Helper.request(resource,"host", id);

            $.ajax({
                url: "/" + resource +"/" + id + "/host",
                type: "GET",
                dataType: "json",
                success: function(response)
                {
                    if (callback)
                    {
                        callback(request, response);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, oZones.Error(response));
                    }
                }
            });
        },
        
        "image": function(params)
        {

            var callback       = params.success;
            var callback_error = params.error;
            var id             = params.data.id;

            var resource = oZones.Zone.resource;
            var request  = oZones.Helper.request(resource,"image", id);

            $.ajax({
                url: "/" + resource +"/" + id + "/image",
                type: "GET",
                dataType: "json",
                success: function(response)
                {
                    if (callback)
                    {
                        callback(request, response);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, oZones.Error(response));
                    }
                }
            });
        },
        
        "template": function(params)
        {

            var callback       = params.success;
            var callback_error = params.error;
            var id             = params.data.id;

            var resource = oZones.Zone.resource;
            var request  = oZones.Helper.request(resource,"template", id);

            $.ajax({
                url: "/" + resource +"/" + id + "/template",
                type: "GET",
                dataType: "json",
                success: function(response)
                {
                    if (callback)
                    {
                        callback(request, response);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, oZones.Error(response));
                    }
                }
            });
        },
        
        "user": function(params)
        {

            var callback       = params.success;
            var callback_error = params.error;
            var id             = params.data.id;

            var resource = oZones.Zone.resource;
            var request  = oZones.Helper.request(resource,"user", id);

            $.ajax({
                url: "/" + resource +"/" + id + "/user",
                type: "GET",
                dataType: "json",
                success: function(response)
                {
                    if (callback)
                    {
                        callback(request, response);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, oZones.Error(response));
                    }
                }
            });
        },
        
        "vm": function(params)
        {

            var callback       = params.success;
            var callback_error = params.error;
            var id             = params.data.id;

            var resource = oZones.Zone.resource;
            var request  = oZones.Helper.request(resource,"vm", id);

            $.ajax({
                url: "/" + resource +"/" + id + "/vm",
                type: "GET",
                dataType: "json",
                success: function(response)
                {
                    if (callback)
                    {
                        callback(request, response);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, oZones.Error(response));
                    }
                }
            });
        },
        
        "vn": function(params)
        {

            var callback       = params.success;
            var callback_error = params.error;
            var id             = params.data.id;

            var resource = oZones.Zone.resource;
            var request  = oZones.Helper.request(resource,"vn", id);

            $.ajax({
                url: "/" + resource +"/" + id + "/vn",
                type: "GET",
                dataType: "json",
                success: function(response)
                {
                    if (callback)
                    {
                        callback(request, response);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, oZones.Error(response));
                    }
                }
            });
        },
        
        "user": function(params)
        {

            var callback       = params.success;
            var callback_error = params.error;
            var id             = params.data.id;

            var resource = oZones.Zone.resource;
            var request  = oZones.Helper.request(resource,"user", id);

            $.ajax({
                url: "/" + resource +"/" + id + "/user",
                type: "GET",
                dataType: "json",
                success: function(response)
                {
                    if (callback)
                    {
                        callback(request, response);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, oZones.Error(response));
                    }
                }
            });
        }
    },

    "VDC": {
        "resource": "vdc",

        "create": function(params)
        {
            var callback       = params.success;
            var callback_error = params.error;
            var data           = params.data;
            var resource       = oZones.VDC.resource;

            var request = oZones.Helper.request(resource,"create", data);

            $.ajax({
                url:  "/" + resource,
                type: "POST",
                dataType: "json",
                data: JSON.stringify(data),
                success: function(response)
                {
                    if (callback)
                    {
                        callback(request, response);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, oZones.Error(response));
                    }
                }
            });
        },

        "delete": function(params)
        {
            var callback       = params.success;
            var callback_error = params.error;
            var id             = params.data.id;
            var resource       = oZones.VDC.resource;


            var request = oZones.Helper.request(resource,"delete", id);

            $.ajax({
                url:  "/" + resource +"/" + id,
                type: "DELETE",
                success: function()
                {
                    if (callback)
                    {
                        callback(request);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, oZones.Error(response));
                    }
                }
            });
        },

        "list": function(params)
        {
            var callback       = params.success;
            var callback_error = params.error;
            var timeout        = params.timeout || false;

            var resource = oZones.VDC.resource;
            var request  = oZones.Helper.request(resource,"list");

            $.ajax({
                url:  "/" + resource,
                type: "GET",
                data: {timeout: timeout},
                dataType: "json",
                success: function(response)
                {
                    if (callback)
                    {
                        var host_pool = oZones.VDC.pool(resource,response);
                        callback(request, vdc_pool);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, oZones.Error(response));
                    }
                }
            });
        },

        "show": function(params)
        {

            var callback       = params.success;
            var callback_error = params.error;
            var id             = params.data.id;

            var resource = oZones.VDC.resource;
            var request  = oZones.Helper.request(resource,"show", id);

            $.ajax({
                url: "/" + resource +"/" + id,
                type: "GET",
                dataType: "json",
                success: function(response)
                {
                    if (callback)
                    {
                        callback(request, response);
                    }
                },
                error: function(response)
                {
                    if (callback_error)
                    {
                        callback_error(request, oZones.Error(response));
                    }
                }
            });
        }
    }
}
