
let workspace = null;
let activity = null;
let components = []

function initialize(){
  components = [];
  workspace = document.getElementById('workspace');
  activity = document.getElementById('activity');
  let e=document.getElementById('container');
  let r=e.getBoundingClientRect();
  e.scroll(Math.max(r.width,r.height), Math.max(r.width,r.height));

  //ATTACH EVENT LISTENERS
  workspace.selectionRectElement = document.createElement('div');
  workspace.selectionRectElement.setAttribute('class','selectionRect')
  workspace.appendChild(workspace.selectionRectElement);

  function startSelectionRectangle(e) {
    if (e.target == workspace){
      workspace.can_start_selection = true;
      let offset = workspace.getBoundingClientRect();
      workspace.rx1 = e.clientX-offset.x;
      workspace.ry1 = e.clientY-offset.y;
    }
  }

  workspace.addEventListener('pointerdown', (e)=>{
    if (e.target == workspace){
      clearSelection();
    }
  });
  workspace.addEventListener('mousedown', startSelectionRectangle);
  window.addEventListener('mousemove', e=>{
    if (workspace.can_start_selection){
      if (!workspace.rect_selection){
        workspace.rect_selection = true;
        workspace.selectionRectElement.style.opacity=1;
      }
      let offset = workspace.getBoundingClientRect();
      workspace.rx2 = e.clientX-offset.x;
      workspace.ry2 = e.clientY-offset.y;
      let x1 = Math.min(workspace.rx2, workspace.rx1);
      let y1 = Math.min(workspace.ry2, workspace.ry1);
      let x2 = Math.max(workspace.rx2, workspace.rx1);
      let y2 = Math.max(workspace.ry2, workspace.ry1);
      let w = x2-x1;
      let h = y2-y1;
      workspace.selectionRectElement.style.left = x1+'px';
      workspace.selectionRectElement.style.top = y1+'px';
      workspace.selectionRectElement.style.width = w+'px';
      workspace.selectionRectElement.style.height = h+'px';
      for (let el of workspace.children){
        if (el.component){
          let elRect = el.getBoundingClientRect();
          if (elRect.x-offset.x > x1 &&
              elRect.x+elRect.width-offset.x < x2 &&
              elRect.y-offset.y > y1 &&
              elRect.y+elRect.height-offset.y < y2){
            select(el);
          }
          else{
            unselect(el);
          }
        }
      }

    }
  })
  window.addEventListener('mouseup', e=>{
    if (workspace.rect_selection || workspace.can_start_selection){   
      workspace.rect_selection = false;
      workspace.can_start_selection = false;
      workspace.selectionRectElement.style.opacity=0;
    }
  })

  let drawer = document.getElementById('drawer');
  for (let e of drawer.children) e.remove();
  createModule("IO");
  createModule("NOT");
  createModule("AND");
  setInterval(updateComponents, 10);
}


function updateComponents() {
  for (let j = 0; j < 5; j++){
    for (let i = 0; i < components.length; i++){
      components[i].update();
    }
  }
}


// SAVE AND LOAD

function save(e){
  let project_name = document.getElementById('project_name').value;

  let modules = [];
  for (let btn of document.getElementById('drawer').children){
    modules.push(btn.innerHTML);
  }

  let savejson = {
    modules: modules,
    components: CCircuit.components,
    workspace: createModuleFromWorkspace(project_name),
  }

  let bb = new Blob([JSON.stringify(savejson)], { type: 'text/json' });
  var a = document.createElement('a');
  a.download = project_name+'.json';
  a.href = window.URL.createObjectURL(bb);
  a.click();
}

json = null;
function load(files) {
  var file = files[0];
  var reader = new FileReader();
  reader.onload = function(progressEvent){
    json = JSON.parse(this.result);
    CCircuit.components = json.components;
    document.getElementById('drawer').innerHTML="";
    initialize();
    for (const key of json.modules) {
      if (key) createModule(key, CCircuit.components[key]);
    }
    clearWorkspace();
    workspaceFromJSON(json.workspace);
  };
  reader.readAsText(file); 
}

function workspaceFromJSON(jsonComponent){
  document.getElementById('project_name').innerHTML = jsonComponent.name;
  let components = []
  for (const i in jsonComponent.components){
    let comp = addComponent(jsonComponent.components[i]);
    comp.element.style.left = jsonComponent.g[i].x;
    comp.element.style.top = jsonComponent.g[i].y;
    components.push(comp);
  }
  for (const i in jsonComponent.connections){
    let cout = jsonComponent.connections[i][0];
    let cin = jsonComponent.connections[i][1];
    let gnode_out = components[cout[0]].outputs[cout[1]-components[cout[0]].inputs.length];
    let gnode_in = components[cin[0]].inputs[cin[1]];
    let con = new GConnection(gnode_out);
    con.connect(gnode_in);
  }
  return components;
}

// CREATE MODULE
function getModuleBtn(module_name){
  for (let current of drawer.children){
    if (current.innerHTML == module_name){
      return current;
    }
  }
  return null;
}
function createModule(module_name, module_json){
  let name = module_name;
  let json = module_json;
  if (name == undefined && json == undefined){
    let component_name = document.getElementById("component_name");
    name = component_name.value.toUpperCase();
    component_name.value="";
    json = createModuleFromWorkspace(name);
    CCircuit.components[json.name] = json;
    clearWorkspace();
  } 
  let drawer = document.getElementById("drawer");

  let btn = getModuleBtn(name);
  if (!btn){
    btn = document.createElement('button');
    btn.setAttribute('id','d'+drawer.children.length);
    btn.setAttribute('draggable','true');
    btn.innerHTML = name;
    btn.onclick = ()=>{addComponent(btn.innerHTML)};
    btn.ondragstart = dragStart;
    btn.ondragover= allowDrop;
    btn.oncontextmenu=(e)=>{
      e.preventDefault();
      e.stopPropagation();
      let components = workspaceFromJSON(CCircuit.components[btn.innerHTML]);
      for (let cmp of components){
        select(cmp.element);
      }
      components[0].element.scrollIntoView();
      btn.remove();
    };
    drawer.appendChild(btn);
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
  json.g = components.map(e=>{return e.toJSON()});
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



// KEY EVENTS HANDLE

addEventListener("keydown", (e)=>{
  if (e.key=='Delete'){
    removeSelection();
  }
  if (e.key=='Escape'){
    abortActivity();
    if (document.getElementById('id01').style.display!='none'){
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
  if (activity.activity_name && activity.activity_name != activity_name){
    if (forcestart){
      resetActivity();
    }
    else{
      return false;
    }
  }
  if (activity.activity_name != activity_name){
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
  }
  activity.activity_name = activity_name;
  activity.onabort = onabort;
  activity.aborted = false;
  activity.style.transform='translateY(0)';
  activity.style.visibility='visible'
  activity.ontransitionend=null;
  return true;
}

function resetActivity(){
  activity.activity_name = null;
  activity.ontransitionend = null;
  activity.onabort = null;
  activity.aborted = false;
  for (let c of activity.children){
    c.remove();
  }
}

function abortActivity(activity_name) {   
  if (activity_name && activity_name!=activity.activity_name || activity.aborted) return;
  activity.ontransitionend=resetActivity;
  activity.style.transform='translateY(-5em)';
  activity.style.visibility='hidden';
  if (!activity.aborted){
    activity.aborted = true;
    activity.onabort?.();
  }
  activity.onabort = null;
}

function endActivity(activity_name){
  if (activity_name && activity_name!=activity.activity_name || activity.aborted) return;
  activity.ontransitionend=resetActivity;
  activity.style.transform='translateY(-5em)';
  activity.style.visibility='hidden';
}
