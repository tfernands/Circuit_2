// Events ["connected", "disconnected", "statechange"]

class CNode {

	static INPUT = 0;
	static OUTPUT = 1;

	constructor(id, type, component){
		this.id = id;
		if (type != CNode.INPUT && type != CNode.OUTPUT){
			throw "Node type must be CNode.INPUT or CNode.OUTPUT";
		}
		this.type = type;
		this.connections = [];
		this.state = 0;
		this.events = {};
		this.input = null;
		this._component = component;
	}

	connect(node){
		if (node instanceof CNode){
			if (this.type == CNode.OUTPUT && node.type == CNode.INPUT){
				if (node.input != null){
					node.input.disconnect(node);
				}
				if (this.connections.indexOf(node) == -1 && node.connections.indexOf(this) == -1){
					this.connections.push(node);
					node.input = this;
					node.checkStateChange();
					this._dispatchEvent('connected');
					node._dispatchEvent('connected')
					return true;
				}
			}
			else if (this.type == CNode.INPUT && node.type == CNode.OUTPUT){
				return node.connect(this);
			}
			else{
				throw "Can not create connections between nodes of the same type";
			}
		}	
		throw "TypeError 'node' are not a CNode";
	}

	disconnect(node){
		if (this.type == CNode.OUTPUT && node.type == CNode.INPUT){
			let i = this.connections.indexOf(node);
			if (i!=-1){
				this.connections.splice(i,1);
				node.input = null;
				node.checkStateChange();
				this._dispatchEvent('disconnected');
				node._dispatchEvent('disconnected');
				return true;
			}
		}
		else if (this.type == CNode.INPUT && node.type == CNode.OUTPUT){
			return node.disconnect(this);
		}
		return false;
	}

	disconnectAll(){
		for (let n of this.connections){
			this.disconnect(n);
		}
		this.input?.disconnect?.(this);
	}

	reset(){
		this.state = 0;
	}

	checkStateChange(){
		if (this.input == null){
			this.write(0);
		}
		else{
			this.write(this.input.read());
		}
	}

	read(){
		return this.state;
	}

	write(state){
		if (state > 0) state = 1;
		else state = 0;
		if (this.state != state){
			this.state = state;
			for (let n of this.connections){
				n.checkStateChange();
			}
			this._dispatchEvent('statechange');
		}
	}

	addEventListener(event_name, callback){
		if (this.events[event_name] != undefined){
			this.events[event_name].push(callback);
		}
		else{
			this.events[event_name] = [callback];
		}
	}

	_dispatchEvent(event_name, args){
		if (this.events[event_name] != undefined){
			for (let ev of this.events[event_name]){
				ev(args);
			}
		}
	}

	toJSON(){
		return {
			id: this.id,
			type: this.type,
			state: this.state,
			connection: this.connections.map(e=>{return e.id}),
		};
	}

	toString(){
		let strType = this.type==CNode.INPUT?"INPUT":"OUTPUT";
		return "{id:"+this.id+", type:"+strType+", state:"+this.read()+"}"
	}

}
