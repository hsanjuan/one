/* -------------------------------------------------------------------------- */
/* Copyright 2002-2012, OpenNebula Project Leads (OpenNebula.org)             */
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

var config_response = {}
var config_tab_content =
'<form>\
<table id="config_table" style="width:100%">\
  <tr>\
    <td>\
      <div class="panel">\
<h3>' + tr("Self-Service UI Configuration") + '</h3>\
        <div class="panel_info">\
\
          <table class="info_table">\
            <tr>\
              <td class="key_td">' + tr("Language") + '</td>\
              <td class="value_td">\
                   <select id="lang_sel" style="width:20em;">\
                       <option value="en_US">'+tr("English")+'</option>\
                       <option value="zh_TW">'+tr("Chinese")+' (TW)</option>\
                       <option value="fr_CA">'+tr("French (CA)")+'</option>\
                       <option value="fr_FR">'+tr("French (FR)")+'</option>\
                       <option value="de">'+tr("German")+'</option>\
                       <option value="it_IT">'+tr("Italian")+'</option>\
                       <option value="fa_IR">'+tr("Persian (IR)")+'</option>\
                       <option value="pt_BR">'+tr("Portuguese (BR)")+'</option>\
                       <option value="pt_PT">'+tr("Portuguese (PT)")+'</option>\
                       <option value="sk_SK">'+tr("Slovak")+'</option>\
                       <option value="es_ES">'+tr("Spanish")+'</option>\
                   </select>\
              </td>\
            </tr>\
          </table>\
\
        </div>\
      </div>\
    </td>\
  </tr>\
</table></form>';

var config_actions = {
    "Config.list" : {
        type : 'list',
        call : OCCI.Config.list,
        callback : updateConfig,
        error : onError
    },
};

var config_tab = {
    title: '<i class="icon-wrench"></i>'+tr("Configuration"),
    content: config_tab_content
}

Sunstone.addActions(config_actions);
Sunstone.addMainTab('config_tab',config_tab);

function updateConfig(request, response){
    config_response = response;
    //These two variables defined in compute.js
    vnc_enable = config_response['VNC'] == 'true' ||
        config_response['VNC'] == 'yes' ? true : false;
    use_wss = config_response['WSS'] == 'true' ||
        config_response['WSS'] == 'yes'? true : false;
};

$(document).ready(function(){
    Sunstone.runAction('Config.list');

    $('#li_config_tab').click(function(){
        hideDialog();
    });

    //Set lang to the right value
    if (lang)
        $('table#config_table #lang_sel option[value="'+lang+'"]').attr('selected','selected');

    //Listen to changes in language
    $('table#config_table #lang_sel').change(function(){
        setLang($(this).val());
    });

    //Vendor customization, change small logo
    $('div#logo img').attr('src',logo_small);
});