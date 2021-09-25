
let components = []

function save(e){
  let bb = new Blob([JSON.stringify(CCircuit.components)], { type: 'text/plain' });
  var a = document.createElement('a');
  a.download = 'Logic_Gates.json';
  a.href = window.URL.createObjectURL(bb);
  a.click();
}

function load(files) {
  var file = files[0];
  var reader = new FileReader();
  reader.onload = function(progressEvent){
    CCircuit.components = JSON.parse(this.result);
    document.getElementById('drawer').innerHTML="";
    initialize();
    for (const key in CCircuit.components) {
      if (key) createModule(key, CCircuit.components[key]);
    }
  };
  reader.readAsText(file); 
}

function createModule(module_name, module_json){
  let name = module_name;
  let json = module_json;
  if (name == undefined && json == undefined){
    let component_name = document.getElementById("component_name");
    name = component_name.value.toUpperCase();
    component_name.value="";
    json = createModuleFromWorkspace(name);
    clearWorkspace();
  } 
  let drawer = document.getElementById("drawer");
  let btn = document.createElement('button');
  btn.setAttribute('id','d'+drawer.children.length);
  btn.setAttribute('draggable','true');
  btn.innerHTML = name;
  try{
    btn.onclick = ()=>{addComponent(btn.innerHTML)};
    btn.ondragstart = dragStart;
    btn.ondragover= allowDrop;
    drawer.appendChild(btn);
  }finally{
    return true;
  }
  return true;
}

function createModuleFromWorkspace(name){
  if (name.length == 0 || components.length < 2)
    return false;
  //ORDENAR ENTRADA E SAIDAS
  components = components.sort((a, b)=>{
    if (a.element.getBoundingClientRect().y > b.element.getBoundingClientRect().y){
      return 1;
    }
    else
      return -1;
  });
  let json = (new CCircuit(name, components.map(e=>{return e.ccomp}))).toJSON();
  CCircuit.components[json.name] = json;
  return json;
}

function clearWorkspace(){
  for (let c of components) c.remove();
  components.length = 0;
}

function addComponent(json){
  let workspace = document.getElementById("workspace");
  let component = new GComponent(CCircuit.fromJSON(json));
  components.push(component);
  workspace.appendChild(component.element);
  let offsetRect = workspace.getBoundingClientRect();
  let contentRect = workspace.parentElement.getBoundingClientRect();
  let rect = component.element.getBoundingClientRect();
  component.element.style.top=(-offsetRect.y-rect.height/2+contentRect.height/2)+'px';
  component.element.style.left=(-offsetRect.x-rect.width/2+contentRect.width/2)+'px';
  return component;
}

function updateComponents() {
  for (let j = 0; j < 5; j++){
    for (let i = 0; i < components.length; i++){
      components[i].update();
    }
  }
}


addEventListener("keydown", (e)=>{
  if (e.key=='Delete'){
    removeSelection();
  }
  if (e.key=='Escape'){
    if (GConnection.connection_creation_mode){
      GConnection.createConnectionAbort();
    }
    else if (document.getElementById('id01').style.display!='none'){
      document.getElementById('id01').style.display='none';
    }
    else if (document.getElementById('id02').style.display!='none'){
      document.getElementById('id02').style.display='none';
    }
  }
});

function openContextMenu(names, callbacks){
  let content = document.getElementById("ctx-01");
  content.innerHTML ="";
  for (let i in names){
    let option = document.createElement('button');
    option.onclick = callbacks[i];
  }
}

function dragStart(event) {
  event.dataTransfer.setData("Text", event.target.id);
  //event.target.style.visibility='hidden';
}

function onDrop(event) {
  event.preventDefault();
}

function allowDrop(event) {
  event.preventDefault();
}

function drawer_drop(event) {
  event.preventDefault();
  let data = event.dataTransfer.getData("Text");
  let dragged = document.getElementById(data);
  event.target.parentElement.insertBefore(dragged,event.target);
}

function workspace_drop(e){
  e.preventDefault();
  let data = e.dataTransfer.getData("Text");
  let dragged = document.getElementById(data);
  let component = addComponent(dragged.innerHTML);
  let offsetRect = component.element.parentElement.getBoundingClientRect();
  let rect = component.element.getBoundingClientRect();
  component.element.style.top=(e.clientY-offsetRect.y-rect.height/2)+'px';
  component.element.style.left=(e.clientX-offsetRect.x-rect.width/2)+'px';
}

let current_activity = null;

function startActivity(activity_name, actions, onabort, forcestart){
  if (!(actions instanceof Array)){
    actions = [actions];
  }
  let activity = document.getElementById('activity');
  for (let c of activity.children){c.remove()}
  if (activity.activity_name && activity.activity_name != activity_name){
    if (forcestart){
      activity.onabort?.();
      destroyActivity();
    }
    else{
      return false;
    }
  }
  activity.activity_name = activity_name;
  activity.onabort = onabort;
  for (let action of actions){
    let action_el = document.createElement('div');
    let icon_el = document.createElement('i');
    icon_el.setAttribute('class', 'material-icons');
    icon_el.innerHTML = action.icon;
    let text_el = document.createElement('span');
    text_el.innerHTML = action.text;
    action_el.appendChild(icon_el);
    action_el.appendChild(text_el);
    action_el.onclick=action.callback;
    activity.appendChild(action_el);
  }
  activity.style.transform='translateY(0)';
  activity.style.visibility='visible'
  return true;
}
function destroyActivity(activity_name) {
  let activity = document.getElementById('activity');
  if (activity_name && activity_name!=activity.activity_name){
    return;
  }
  activity.style.transform='translateY(-5em)';
  activity.style.visibility='hidden';
  activity.onabort;
  activity.ontransitionend=()=>{
    for (let c of activity.children){
      c.remove();
    }
    activity.activity_name = null;
    activity.ontransitionend = null;
    activity.onabort = null;
  };
}

setInterval(updateComponents, 10);