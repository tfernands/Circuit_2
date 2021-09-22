from circuit_components import Resistor

class Queue:

    queue: list
    key: 'function'

    def __init__(self, queue: [list]=None, key:'function'=lambda a: a):
        self.queue = []
        self.key = key
        if not queue is None:
            for v in queue:
                self.put(v)

    def put(self, v):
        i = 0
        for i, q in enumerate(self.queue):
            if self.key(q) > self.key(v):
                i-=1
                break
        self.queue.insert(i+1, v)

    def get(self):
        return self.queue.pop(0)

    def __iter__(self):
        return self

    def __next__(self):
        if len(self.queue) > 0:
            return self.get()
        else:
            raise StopIteration

    def __len__(self):
        return self.queue.__len__()

    def __str__(self):
        return 'Queue: ({})'.format(self.queue)

def bmpAStar(obstacles:set, a:tuple, b:tuple, lim: tuple=(50, 20)) -> list:
    prev = {a: None}
    cost = {a: 0}
    queue = Queue([a], key=lambda a: cost[a])
    def gen_steps(n: tuple) -> list:
        pos = [(n[0]+1, n[1]), (n[0]-1, n[1]), (n[0], n[1]+1), (n[0], n[1]-1)]
        return filter(lambda a: a not in obstacles or a == b, pos)
    def dist_cost(a: tuple) -> float:
        return abs(b[0]-a[0])+abs(b[1]-a[1])
    def turn_cost(a:tuple, b:tuple, c:tuple) -> float:
        if a is not None and b is not None and c is not None:
            if (a[0]==b[0]) != (b[0]==c[0]):
                return 1
        return 0
    for n in queue:
        if abs(n[0]) >= lim[0] and abs(n[1]) >= lim[1]:
            return None
        if n == b:
            path = [prev[b]]
            while prev[path[0]]:
                path.insert(0, prev[path[0]])
            path.append(b)
            return path
        for cel in gen_steps(n):
            n_cost = cost[n]+1+dist_cost(cel)*0+turn_cost(prev[n],n,cel)*1
            if cel not in cost:
                cost[cel] = n_cost
                prev[cel] = n
                queue.put(cel)
            elif cost[cel] > n_cost:
                cost[cel] = n_cost
                prev[cel] = n
                

def r(r:Resistor):
    if r.r < 1:
        return 'r.'+str(int(r.r*10))
    if r.r < 100:
        return 'r'+str(int(r.r))
    return 'r99+'

def print_circuit(circuit, w=35, h=8, name=None):
    from ascii2d import Ascii2D
    nodes = list(circuit.nodes())
    n2coord = dict()
    obstacles = dict()
    def maskout_obstacles(mask):
        f = []
        for k, v in obstacles.items():
            if v not in mask:
                f.append(k)
        return f
    def add_obstacles(values, tag):
        for v in values:
            obstacles[v] = tag
    for i, node in enumerate(nodes):
        n2coord[node] = (i*7+5,3)
        obstacles[n2coord[node]] = node
    # circuit.graph.sort(key=lambda a: abs(n2coord[a[0]][0]-n2coord[a[1]][0])+abs(n2coord[a[0]][1]-n2coord[a[1]][1]))
    
    c_paths = Ascii2D(w*2+1, h)
    c_obstacles = Ascii2D(w, h)
    c_nodes = Ascii2D(w, h)

    for edge in circuit.graph:
        p0, p1 = n2coord[edge.a], n2coord[edge.b]
        path = bmpAStar(maskout_obstacles(edge), p0, p1)
        if path is None:
            path = bmpAStar(maskout_obstacles(edge), p0, p1)
        if path is None:
            return

        p_middle = len(path)//2
        for i in range(p_middle):
            if path[p_middle+i] not in obstacles:
                ri, rx, ry = p_middle+i, *path[p_middle+i]
                break
            if path[p_middle-i] not in obstacles:
                ri, rx, ry = p_middle-i, *path[p_middle-i]
                break
        path_in = path[:ri+1]
        path_out = path[ri:]
        #path_in = bmpAStar(maskout_obstacles(edge[0]), p0, (rx,ry))
        #path_out = bmpAStar(maskout_obstacles(edge[1]), (rx,ry), p1)
        add_obstacles(path_in, edge.a)
        add_obstacles(path_out, edge.b)

        if isinstance(edge, Resistor):
            add_obstacles([(rx,ry),(rx-1,ry)],'r')
            c_nodes.text(r(edge),(rx-1,ry))
        c_paths.path(path_in,edge.a)
        c_paths.path(path_out,edge.b)
        for n in nodes:
            c_nodes.text(n, n2coord[n])
        for k, v in obstacles.items():
            c_obstacles.pixel(v,k)
        ## DEBUG
        # temp_path = Ascii2D(w, h)
        # temp_path.path(path_in)
        # temp_path.path(path_out)
        # print('p0 = {}'.format(p0))
        # print('p1 = {}'.format(p1))
        # print('obstacles = [',end='')
        # for k in maskout_obstacles(edge):
        #     temp_path.pixel('#',k)
        #     print(k,end=',')
        # print(']')
        # temp_path.pixel('r',rx,ry)
        # temp_path.pixel('s',p0)
        # temp_path.pixel('f',p1)
        # c_debug = Ascii2D(w*2+1, h, str(edge))
        # c_debug.canvas(temp_path,0,0,'')
        # c_debug.line('#',(w,0),(w,h))
        # c_debug.canvas(temp_path, w, 0)
        # c_debug.canvas(c_paths, 0, 0)
        # c_debug.canvas(c_nodes, 0, 0)
        # print(c_debug)

    canvas = Ascii2D(35, 8, name=name)
    canvas.canvas(c_paths,0,0)
    canvas.canvas(c_nodes,0,0)
    print(canvas)