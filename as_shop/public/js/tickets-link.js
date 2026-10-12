/* Support uses the shared Industries customer account. */
(() => {
  window.AS_TICKET_LINK = () => {
    if (document.getElementById("as-chat-toggle")) return;
    const button=document.createElement("button");button.type="button";button.id="as-chat-toggle";
    button.textContent=window.SITE_LANGUAGE==="fa"?"پیام به ما":"Send a message";
    button.onclick=()=>location.assign(window.SHN_NAVIGATION.targetURL("as","/tickets?new=1"));
    document.body.append(button);
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",window.AS_TICKET_LINK,{once:true});
  else window.AS_TICKET_LINK();
})();
