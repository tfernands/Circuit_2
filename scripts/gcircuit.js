let offsetX, offsetY;

class GNode {

  constructor(cnode){
    this.cnode = cnode;
    this.element = document.createElement('div');
    this.element.setAttribute('class', 'io tooltip');
    this.element.setAttribute('type', cnode.type);
    this.element.setAttribute('id', cnode.id);
    this.element.setAttribute('state', cnode.state);

    let tooltip = document.createElement('p');
    this.element.appendChild(tooltip);

    tooltip.setAttribute('class','tooltiptext '+(cnode.type==CNode.INPUT?'tooltip-right':'tooltip-left'));
    tooltip.setAttribute('contenteditable',"true");
    tooltip.innerHTML = this.cnode.id;
    tooltip.addEventListener("input", function() {
      this.cnode.id = tooltip.innerHTML;
      tooltip.innerHTML = this.cnode.id;
    }, false);

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
      this.element.addEventListener('click', (e)=>{
        if (e.path[0] == this.element &&
            this.cnode.input == null &&
            !GConnection.connection_creation_mode){
          this.changeState();
          updateComponents();
        }
      });
      this.element.addEventListener('mouseover', (e)=>{
        if (GConnection.connection_creation_mode){
          GConnection.tempConnection.gnode2 = this;
        }
      });
      this.element.addEventListener('mouseout', (e)=>{
        if (GConnection.connection_creation_mode){
          GConnection.tempConnection.gnode2 = null;
        }
      });
    }
    if (this.cnode.type == CNode.OUTPUT){
      this.element.addEventListener('click',(e)=>{
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

  remove(){
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

  static svgOffsetX = 0;
  static svgOffsetY = 0;
  static connection_creation_mode = false;
  static tempConnection = null;

  static createConnectionBegin(gnode){
    GConnection.connection_creation_mode = true;
    GConnection.tempConnection = new GConnection(gnode, null);
    document.onmousemove = (e)=>{
      e = e || window.event;
      e.preventDefault();
      GConnection.tempConnection.updatePosition();
      let d = GConnection.tempConnection.element.getAttribute('d');
      let x2 = e.clientX - GConnection.svgOffsetX;
      let y2 = e.clientY - GConnection.svgOffsetY;
      GConnection.tempConnection.element.setAttribute('d', d+' L '+x2+' '+y2);
      GConnection.tempConnection.element.setAttribute('state', gnode.read());
    }

    document.onmouseup = (e)=>{
      if (GConnection.tempConnection.gnode2 != null){
        GConnection.tempConnection.connect(GConnection.tempConnection.gnode2);
      }
      else{
        GConnection.tempConnection.addPoint(e.clientX, e.clientY);
      }
    }
  }

  static createConnectionAbort(){
    GConnection.connection_creation_mode = false;
    GConnection.tempConnection.disconnect();
    document.onmouseup = null;
    document.onmousemove = null;
  }

  static createConnectionEnd(){
    if (GConnection.tempConnection.gnode2 == null){
      return GConnection.createConnectionAbort();
    }
    GConnection.connection_creation_mode = false;
    document.onmouseup = null;
    document.onmousemove = null;
  }

  constructor(gnode1){
    this.gnode1 = gnode1;
    this.gnode2 = null;
    this.svg = document.getElementById("svg");
    this.points = [];
    let rect = this.svg.getBoundingClientRect();
    GConnection.svgOffsetX = rect.x;
    GConnection.svgOffsetY = rect.y;
    this.element = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    this.svg.appendChild(this.element);
    this.element.addEventListener('click', (e)=>{select(this.element, this);});
  }

  addPoint(x, y){
    let circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
    circle.setAttribute('cx', x - GConnection.svgOffsetX);
    circle.setAttribute('cy', y - GConnection.svgOffsetY);
    circle.setAttribute('i', this.points.length);
    circle.setAttribute('draggable','true');
    circle.addEventListener('mousedown', dragstart);
    circle.ondrag = (e)=>{
      circle.setAttribute('cx', circle.style.left);
      circle.setAttribute('cy', circle.style.top);
      let i = circle.getAttribute('i');
      let r = circle.getBoundingClientRect();
      this.points[i][0] = r.x+r.width/2;
      this.points[i][1] = r.y+r.height/2;
      this.updatePosition();
    };
    this.svg.appendChild(circle);
    this.points.push([x, y, circle]);
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
    let r1 = this.gnode1.element.getBoundingClientRect();
    let x1 = r1.x - GConnection.svgOffsetX + r1.width/2;
    let y1 = r1.y - GConnection.svgOffsetY + r1.height/2;
    let d = 'M '+x1+' '+y1;
    for (let p of this.points){
      d += ' L '+(p[0] - GConnection.svgOffsetX)+
             ' '+(p[1] - GConnection.svgOffsetY);
    }
    if (this.gnode2){
      let r2 = this.gnode2.element.getBoundingClientRect();
      let x2 = r2.x - GConnection.svgOffsetX + r2.width/2;
      let y2 = r2.y - GConnection.svgOffsetY + r2.height/2;
      d += ' L '+x2+' '+y2;
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

  _createElement(){
    this.element = document.createElement('div');
    this.element.setAttribute('class','component');
    this.element.setAttribute('draggable','true');
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
    this.element.addEventListener('mousedown', (e)=>{select(e.path[0], this);});
    this.element.addEventListener('mousedown', dragstart);

    this.element.ondragstart = ()=>{
      this.element.setAttribute('ondrag','');
    }
    this.element.ondragend = ()=>{
      this.element.removeAttribute('ondrag');
      let e = this.element.parentElement.children[this.element.parentElement.children.length-1];
      this.element.parentElement.insertBefore(this.element,e);
      this.element.parentElement.insertBefore(e,this.element);
    }
    this.element.ondrag = (e)=>{
      for (let i = 0; i < this.inputs.length; i++){
        this.inputs[i]._updatePathPositions();
      }
      for (let i = 0; i < this.outputs.length; i++){
        this.outputs[i]._updatePathPositions();
      }
    }
  }
}

function dragstart(e) {
  e = e || window.event;
  e.preventDefault();
  if (e.path[0].hasAttribute('draggable')){
    elmnt = e.path[0];
    let rect = elmnt.getBoundingClientRect();
    offsetX = rect.x-e.clientX;
    offsetY = rect.y-e.clientY;
    document.addEventListener('mousemove', draggable_drag);
    document.addEventListener('mouseup', draggable_close);
  }
}

function draggable_drag(e) {
  e = e || window.event;
  e.preventDefault();
  let rect = elmnt.getBoundingClientRect();
  let offsetRect = elmnt.parentElement.getBoundingClientRect();
  let posX = offsetX+e.clientX-offsetRect.x;
  let posY = offsetY+e.clientY-offsetRect.y;
  elmnt.style.left = posX + "px";
  elmnt.style.top = posY + "px";
  if (elmnt.ondrag) elmnt.ondrag();
}

function draggable_close(e) {
  document.removeEventListener('mousemove', draggable_drag);
  document.removeEventListener('mouseup', draggable_close);
}