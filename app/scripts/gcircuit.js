let offsetX, offsetY, workspace;
let selection = [];

class GNode {

  constructor(cnode){
    this.cnode = cnode;
    this.element = document.createElement('div');
    this.element.setAttribute('class', 'io tooltip');
    this.element.setAttribute('type', cnode.type);
    this.element.setAttribute('id', cnode.id);
    this.element.setAttribute('state', cnode.read());

    let tooltip = document.createElement('p');
    this.element.appendChild(tooltip);
    tooltip.setAttribute('class','tooltiptext '+(cnode.type==CNode.INPUT?'tooltip-right':'tooltip-left'));
    tooltip.innerHTML = this.cnode.id;

    this.element.addEventListener('contextmenu', function(ev) {
      ev.preventDefault();
      let pop = document.getElementById('id02');
      pop.style.display='block';
      let form = pop.querySelector('form');
      let input = document.getElementById('io_name');
      input.focus();
      input.value = cnode.id;
      form.onsubmit = event=>{
        event.preventDefault();
        cnode.id = input.value;
        tooltip.innerHTML = input.value;
        document.getElementById('id02').style.display='none';
        return false;
      };
      return false;
    }, false);


    this.cnode.gnode = this;
    this.paths = []

    this.cnode.addEventListener('statechange', ()=>{
      this.element.setAttribute('state', this.cnode.read());
      for (let p of this.paths){
        p.updateState();
      }
    });
    
    if (this.cnode.type == CNode.INPUT){
      this.element.style.cursor = 'pointer';
      this.element.addEventListener('pointerdown', (e)=>{
        if (e.path[0] == this.element && !this.cnode.hasConnection() && !GConnection.connection_creation_mode){
          this.changeState();
          updateComponents();
        }
      });
      this.element.addEventListener('pointerover', (e)=>{
        if (GConnection.connection_creation_mode){
          console.log('overs')
          GConnection.tempConnection.gnode2 = this;
        }
      });
      this.element.addEventListener('pointerout', (e)=>{
        if (GConnection.connection_creation_mode){
          GConnection.tempConnection.gnode2 = null;
        }
      });
    }
    if (this.cnode.type == CNode.OUTPUT){
      this.element.addEventListener('pointerdown', (e)=>{
        GConnection.createConnectionBegin(this);
      });
    }
  }

  read(){
    return this.cnode.read();
  }

  changeState(){
    if (this.cnode.read()==1) this.cnode.write(0);
    else this.cnode.write(1);
  }

  getPosition(){
    let pr = workspace.getBoundingClientRect();
    let r = this.element.getBoundingClientRect();
    return {
      x: r.x - pr.x + r.width/2,
      y: r.y - pr.y + r.height/2,
    };
  }

  remove(){
    this.unselect();
    this.element.remove();
    for (let e of this.paths) e.remove();
    this.cnode.disconnectAll();
  }

  _updatePathPositions(){
    for (let p of this.paths){
      p.updatePosition();
    }
  }
}


class GConnection {

  static connection_creation_mode = false;
  static tempConnection = null;

  static createConnectionBegin(gnode){
    GConnection.connection_creation_mode = true;
    GConnection.tempConnection = new GConnection(gnode, null);
    document.onpointermove = (e)=>{
      e = e || window.event;
      e.preventDefault();
      GConnection.tempConnection.updatePosition();
      let d = GConnection.tempConnection.element.getAttribute('d');
      let pr = workspace.getBoundingClientRect();
      let x = e.clientX-pr.x;
      let y = e.clientY-pr.y;
      GConnection.tempConnection.element.setAttribute('d', d+' L '+x+' '+y);
      GConnection.tempConnection.element.setAttribute('state', gnode.read());
    }

    document.onpointerup = (e)=>{
      if (GConnection.tempConnection.gnode2 != null){
        GConnection.tempConnection.connect(GConnection.tempConnection.gnode2);
      }
      else{
        let pr = workspace.getBoundingClientRect();
        let x = e.clientX-pr.x;
        let y = e.clientY-pr.y;
        GConnection.tempConnection.addPoint(x, y);
      }
    }
  }

  static createConnectionAbort(){
    GConnection.connection_creation_mode = false;
    GConnection.tempConnection.disconnect();
    document.onpointerup = null;
    document.onpointermove = null;
  }

  static createConnectionEnd(){
    if (GConnection.tempConnection.gnode2 == null){
      return GConnection.createConnectionAbort();
    }
    GConnection.connection_creation_mode = false;
    document.onpointerup = null;
    document.onpointermove = null;
  }

  constructor(gnode1){
    this.gnode1 = gnode1;
    this.gnode2 = null;
    this.svg = document.getElementById("svg");
    this.points = [];
    this.element = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    this.svg.appendChild(this.element);
    this.element.addEventListener('click', (e)=>{this.select()});
    this.selected = false;
  }

  select(){
    if (!this.element.hasAttribute('selected')){
      this.element.setAttribute('selected','');
      for (let p of this.points){
        p[2].setAttribute('selected','');
      }
      selection.push(this);
    }
  }

  unselect(){
    let i = selection.indexOf(this);
    this.element.removeAttribute('selected');
    selection.splice(i,1);
    for (let p of this.points){
      p[2].removeAttribute('selected');
    }
    selection.pop(this);
  }

  addPoint(x, y){
    // let circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
    // circle.setAttribute('cx', x);
    // circle.setAttribute('cy', y);
    // circle.setAttribute('i', this.points.length);
    // circle.setAttribute('class','draggable');
    // circle.setAttribute('state',  this.gnode1.read());
    // circle.onmove = (e)=>{
    //   circle.setAttribute('cx', circle.style.left);
    //   circle.setAttribute('cy', circle.style.top);
    //   let i = circle.getAttribute('i');
    //   let r = circle.getBoundingClientRect();
    //   let or = workspace.getBoundingClientRect();
    //   this.points[i][0] = r.x-or.x+r.width/2;
    //   this.points[i][1] = r.y-or.y+r.height/2;
    //   this.updatePosition();
    // };
    // this.svg.appendChild(circle);
    // this.points.push([x, y, circle]);
  }

  connect(gnode2){
    this.gnode2 = gnode2;
    if (!this.gnode2){
      return false;
    }
    if (this.gnode1.cnode.connect(this.gnode2.cnode)){
      this.updatePosition();
      this.gnode1.paths.push(this);
      this.gnode2.paths.push(this);
      this.gnode2.cnode.addEventListener('disconnected', ()=>{this.disconnect()})
      GConnection.createConnectionEnd();
      return true;
    }
    GConnection.createConnectionAbort();
    return false;
  }

  disconnect(){
    this.remove();
  }

  remove(){
    this.unselect();
    let i = this.gnode1.paths.indexOf(this);
    this.gnode1.paths.splice(i,1);
    if (this.gnode2 != null){
      i = this.gnode2.paths.indexOf(this);
      this.gnode2.paths.splice(i,1);
      this.gnode1.cnode.disconnect(this.gnode2.cnode)
    }
    this.element.remove();
    for (let p of this.points){
      p[2].remove();
    }
  }

  updateState(){
    let state = this.gnode1.read();
    this.element.setAttribute('state', state);
    for (let p of this.points){
      p[2].setAttribute('state', state);
    }
  }

  updatePosition(){
    let p1 = this.gnode1.getPosition();
    let d = 'M '+p1.x+' '+p1.y;
    for (let p of this.points){
      d += ' L '+(p[0])+
             ' '+(p[1]);
    }
    if (this.gnode2){
      let p2 = this.gnode2.getPosition();
      d += ' L '+p2.x+' '+p2.y;
    }
    this.element.setAttribute('d', d);
  }

  toJSON(){
    return {
      input: this.gnode1.cnode.id,
      output: this.gnode2.cnode.id,
      points: this.points,
    }
  }

}

class GComponent {

  constructor(ccomp){
    this.ccomp = ccomp;
    this.inputs = [];
    this.outputs = [];
    this._createElement();
    this.update();

    if (!workspace){
      workspace = document.getElementById('workspace');
      workspace.addEventListener('pointerdown',e=>{
        while(selection.length > 0){
          selection[0].unselect();
        }
      });
    }
  }

  select(){
    if (!this.element.hasAttribute('selected')){
      this.element.setAttribute('selected','');
      selection.push(this);
    }
  }

  unselect(){
    let i = selection.indexOf(this);
    this.element.removeAttribute('selected');
    selection.splice(i,1);
  }

  toggleSelection(){
    if (this.element.hasAttribute('selected')){
      this.unselect();
    }
    else{
      this.select()
    }
  }

  update(){
    this.ccomp.update();
  }

  setPosition(x, y){
    this.element.style.top = x + "px";
    this.element.style.left = y + "px";
  }

  remove(){
    this.element.remove();
    for (let n of this.inputs) n.remove();
    for (let n of this.outputs) n.remove();
  }

  _updatePathPositions(){
    for (let i = 0; i < this.inputs.length; i++){
      this.inputs[i]._updatePathPositions();
    }
    for (let i = 0; i < this.outputs.length; i++){
      this.outputs[i]._updatePathPositions();
    }
  }

  _createElement(){
    this.element = document.createElement('div');
    this.element.setAttribute('class','component draggable');
    const ioarr_in = document.createElement('div');
    ioarr_in.setAttribute('class','ioarray in');
    this.element.appendChild(ioarr_in);
    const name = document.createElement('p');
    name.setAttribute('unselectable','');
    this.element.appendChild(name);
    const ioarr_out = document.createElement('div');
    ioarr_out.setAttribute('class','ioarray out');
    this.element.appendChild(ioarr_out);

    name.innerHTML = this.ccomp.name;
    for (let i = 0; i < this.ccomp.inputs.length; i++){
      const node = new GNode(this.ccomp.inputs[i]);
       this.inputs.push(node);
      ioarr_in.appendChild(node.element);
    }
    for (let i = 0; i < this.ccomp.outputs.length; i++){
      const node = new GNode(this.ccomp.outputs[i]);
      this.outputs.push(node);
      ioarr_out.appendChild(node.element);
    }
    this.element.addEventListener('pointerdown', (e)=>{e.stopPropagation(); this.toggleSelection()});
    this.element.onmove = ()=>{this._updatePathPositions()}
  }
}


document.onmousedown = filter;
document.ontouchstart = filter;

function filter(e) {
  let target = e.target;
  if (!target.classList.contains("draggable")) {
    return;
  }
  workspace.parentElement.style = "overflow: hidden";
  target.moving = true;
  
  e.clientX ? // Check if Mouse events exist on user' device
  (target.oldX = e.clientX, // If they exist then use Mouse input
  target.oldY = e.clientY) :
  (target.oldX = e.touches[0].clientX, // otherwise use touch input
  target.oldY = e.touches[0].clientY)

  target.oldLeft = window.getComputedStyle(target).getPropertyValue('left').split('px')[0] * 1;
  target.oldTop = window.getComputedStyle(target).getPropertyValue('top').split('px')[0] * 1;

  document.onmousemove = dr;
  document.ontouchmove = dr;

  function dr(event) {
    if (!target.moving) {
      return;
    }
    event.clientX ?
    (target.distX = event.clientX - target.oldX,
    target.distY = event.clientY - target.oldY) :
    (target.distX = event.touches[0].clientX - target.oldX,
    target.distY = event.touches[0].clientY - target.oldY)

    target.style.left = target.oldLeft + target.distX + "px";
    target.style.top = target.oldTop + target.distY + "px";
    target.onmove?.()
  }

  function endDrag() {
    target.moving = false;
    workspace.parentElement.style = "";
  }
  target.onmouseup = endDrag;
  target.ontouchend = endDrag;

}
