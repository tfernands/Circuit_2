
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
    createModule("IO");
    createModule("NOT");
    createModule("AND");
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

function criar_componente(){
  if(createModule()){
    document.getElementById('id01').style.display='none';
  };
  return false;
}

function addComponent(json){
  let workspace = document.getElementById("workspace");
  let component = new GComponent(CCircuit.fromJSON(json));
  components.push(component);
  workspace.appendChild(component.element);
  component.element.style.top='50%';
  component.element.style.left='50%';
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
    if (selectedOBJ != null){
      if (selectedOBJ instanceof GComponent){
        let i = components.indexOf(selectedOBJ);
        components.splice(i, 1);
        selectedOBJ.remove();
        unselect();
      }
      else if (selectedOBJ instanceof GConnection){
        selectedOBJ.remove();
      }
    }
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


setInterval(updateComponents, 10);

