from util import Queue, print_circuit
from circuit_components import Edge
from circuit_components import Resistor


class Circuit:

    graph: set[Edge]

    def __init__(self, graph: list[Edge]):
        self.graph = set()
        for d in graph:
            if isinstance(d, Edge):
                self.graph.add(d)

    def nodes(self) -> tuple:
        nodes = set()
        for edge in self.graph:
            nodes.add(edge.a)
            nodes.add(edge.b)
        return nodes

    def find_edges_with_node(self, node: str) -> list[str]:
        edges = []
        for edge in self.graph:
            if edge.a == node or edge.b == node:
                edges.append(edge)
        return edges

    def find_edges(self, a:str, b:str) -> list[Edge]:
        edges = []
        for e in self.graph:
            if e.hasNode(a) and e.hasNode(b):
                edges.append(e)
        return edges

    def _has_path(self,nodes:dict[str, bool], prev:dict[str, bool], a:str, b:str, deep=''):
        prev[a] = False
        for e in self.find_edges_with_node(a):
            n = e[a]
            if n == b:
                nodes[n] = True
                return True
            elif n not in prev:
                if self._has_path(nodes, prev.copy(), n, b, deep+' '*4):
                    nodes[a] = nodes[n] = True
        return a in nodes

    def subgraph(self, a:str, b:str) -> list[Edge]:
        nodes = dict()
        nodes[a] = self._has_path(nodes, dict(), a, b)
        for n in self.nodes():
            if n not in nodes:
                nodes[n]=False
        return Circuit(filter(lambda e: nodes[e.a] and nodes[e.b], self.graph))

    def _remove_parallel(self) -> 'Circuit':
        record = []
        unique_edges = []
        for e in self.graph:
            in_unique_list = False
            for e2 in unique_edges:
                if Edge.same_nodes(e, e2):
                    in_unique_list = True
                    break
            if not in_unique_list:
                unique_edges.append(e)
        for e in unique_edges:
            edges = self.find_edges(e.a, e.b)
            if len(edges) > 1:
                s = 0
                for e1 in edges:
                    s += 1/e1.r
                    self.graph.remove(e1)
                req = Resistor(e.a, e.b, 1/s)
                self.graph.add(req)
                record.append((req, edges))
        return record

    def _remove_series(self, fixA:str, fixB:str) -> 'Circuit':
        record = []
        for n in self.nodes():
            if n == fixA or n == fixB:
                continue
            edges = self.find_edges_with_node(n)
            if len(edges) == 2:
                a = edges[0][n]
                b = edges[1][n]
                self.graph.remove(edges[0])
                self.graph.remove(edges[1])
                req = Resistor(a, b, edges[0].r+edges[1].r)
                self.graph.add(req)
                record.append((req, edges))
        return record

    def _find_deltas(self):
        potential = dict()
        for edge in self.graph:
            e = self.find_edges_with_node(edge.a)
            if len(e) > 2:
                if edge.a in potential:
                    potential[edge.a].union([e0[edge.a] for e0 in e])
                else:
                    potential[edge.a] = set([e0[edge.a] for e0 in e])
            e = self.find_edges_with_node(edge.b)
            if len(e) > 2:
                if edge.b in potential:
                    potential[edge.b].union([e0[edge.b] for e0 in e])
                else:
                    potential[edge.b] = set([e0[edge.b] for e0 in e])
        pnodes = list(potential.keys())
        deltas = []
        while len(pnodes) > 0:
            p0 = pnodes.pop()
            p1 = None
            for i in range(len(pnodes)):
                p1 = pnodes[i]
                for j in range(i+1, len(pnodes)):
                    p2 = pnodes[j]
                    if p1 in potential[p0] and \
                       p2 in potential[p0] and \
                       p2 in potential[p1]:
                       deltas.append([p0,p1,p2])
        return deltas

    def _delta2Y(self, a:str, b:str, c:str):
        ab = self.find_edges(a, b)[0]
        ac = self.find_edges(a, c)[0]
        bc = self.find_edges(b, c)[0]
        y = str(len(self.graph))
        r_sum = ab.r+ac.r+bc.r
        ra = Resistor(a,y,(ab.r*ac.r)/r_sum,y+'a')
        rb = Resistor(b,y,(ab.r*bc.r)/r_sum,y+'b')
        rc = Resistor(c,y,(ac.r*bc.r)/r_sum,y+'c')
        self.graph.remove(ab)
        self.graph.remove(ac)
        self.graph.remove(bc)
        self.graph.add(ra)
        self.graph.add(rb)
        self.graph.add(rc)
        return (ra,rb,rc),(ab,ac,bc)

    def _remove_delta(self):
        deltas = self._find_deltas()
        if len(deltas) > 0:
            return [self._delta2Y(*deltas[0])]
        return []

    def req(self, a:str, b:str) -> float:
        c = self.subgraph(a, b)
        while len(c.graph) > 1:
            s = c._remove_series(a, b)
            p = c._remove_parallel()
            if len(s) == 0 and len(p) == 0:
                d = c._remove_delta()
                if len(d) == 0 and len(c.graph) > 1:
                    return None
        return c.graph.pop().r

    def _rsolver(self, record_stack:list[dict[str,Edge,Edge]], solved_info:dict[Edge,tuple], req:Edge) -> None:
        if len(record_stack) > 0:
            rec = record_stack.pop()
            V, R, i = solved_info[req]
            for e in rec['rmv']:
                t = rec['type']
                if t == 's':
                    solved_info[e]=(e.r*i, e.r, i)
                if t == 'p':
                    solved_info[e]=(V, e.r, V/e.r)
                if t == 'd':
                    solved_info[e]=(e.r*i, e.r, V/e.r)
                self._rsolver(record_stack, solved_info, e)

    def solve(self, a:str, va:float, b:str, vb:float) -> float:
        record_stack = []
        c = self.subgraph(a, b)
        while len(c.graph) > 1:
            s = c._remove_series(a, b)
            for req, rmv in s:
                record_stack.append({'type': 's', 'req':req, 'rmv': rmv})
            p = c._remove_parallel()
            for req, rmv in p:
                record_stack.append({'type': 'p', 'req':req, 'rmv': rmv})
            if len(s) == 0 and len(p) == 0:
                d = c._remove_delta()
                for req, rmv in d:
                  record_stack.append({'type': 'd', 'req':req, 'rmv': rmv})
                if len(d) == 0 and len(c.graph) > 1:
                    return None 
        req = c.graph.pop();
        V = va-vb
        R = req.r
        i = V/R
        solved_info={req:(V,R,i)}
        c._rsolver(record_stack, solved_info, req)
        for e in self.graph:
            if e not in solved_info:
                solved_info[e] = (0,0,0)
        return solved_info
        
    def __str__(self):
        return 'Circuit: {}\n\t{}'.format(self.nodes(), '\n\t'.join(map(str,self.graph)))

    def __repr__(self):
        return 'Circuit ({}, {})'.format(self.nodes(), '\n\t'.join(self.graph))

if __name__=='__main__':

    R = Resistor
    c1= Circuit([
        R('A','B',2,'r1'),  
        R('B','C',6,'r2'),
        R('B','C',3,'r3'),
        R('C','D',4,'r4'),
        R('A','D',2,'r5'),
    ])
    c = Circuit([
        R('A','C',70,'r1'),
        R('C','D',20,'r2'),
        R('C','E',50,'r3'),
        R('E','D',30,'r4'),
        R('E','F',10,'r5'),
        R('D','F',40,'r6'),
        R('B','F',60,'r7'),
    ])


    def flow(c,a,b,prev):
        prev.add(a)
        r_sum = 0
        r_mul=1
        for e in c.find_edges_with_node(a):
            n = e[a]
            if n not in prev:
                r_sum+=e.r
                r_mul*=e.r
        res = 0
        for e in c.find_edges_with_node(a):
            print(e,r_sum)
            n = e[a]
            if n == b:
                res += (e.r)/r_sum
            elif n not in prev:
                res += (e.r)/r_sum + flow(c,n,b,prev.copy())
        return res

    print(flow(c1,'A','D',set()))