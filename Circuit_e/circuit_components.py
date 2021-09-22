class Edge:

    id_counter = 0
    _id:str
    _a:str
    _b:str

    def __init__(self, a:str, b:str, id:str=None):
        if a == b:
            raise ReferenceError('a can not be equal b')
        self._a = a
        self._b = b
        if id is None:
            self._id = Edge.id_counter+1
            Edge.id_counter += 1
        else:
            self._id = id

    @staticmethod
    def same_nodes(e1:'Edge', e2:'Edge') -> bool:
        if isinstance(e1, Edge) and isinstance(e2, Edge):
            return (e1.a == e2.a and e1.b == e2.b) or (e1.a == e2.b and e1.b == e2.a)
        else:
            raise TypeError('\'e1 and e2\' type must be Edge')

    def hasNode(self, n:str) -> bool:
        return n == self.a or n == self.b

    @property
    def id(self) -> [str, int]:
        return self._id

    @property
    def a(self) -> str:
        return self._a

    @property
    def b(self) -> str:
        return self._b

    def __hash__(self) -> int:
        hash = 89
        hash = 13*hash + self._id.__hash__()
        hash = 13*hash + (self.a.__hash__()+self.b.__hash__())^(self.a.__hash__()*self.b.__hash__())
        return hash

    def __eq__(self, other: any) -> bool:
        if isinstance(other, Edge):
            return Edge.same_nodes(self, other) and self.id == other.id
        return False

    def __getitem__(self, key:str) -> str:
        if key==0:
            return self.a
        if key==1:
            return self.b
        if key==self.a:
            return self.b
        if key==self.b:
            return self.a
        raise KeyError

    def __str__(self) -> str:
        return str(self.id)+str((self.a, self.b))

    def __repr__(self) -> str:
        return 'Edge\'{}\'{}'.format(self.id, (self.a, self.b))

class Resistor(Edge):

    r:float

    def __init__(self, a:str, b:str, r:float, id:int=None):
        super().__init__(a, b, id=id)
        self.r = r

    def __hash__(self):
        hash = 23
        hash = 7*hash+super().__hash__()
        hash = 7*hash+self.r.__hash__()
        return hash

    def __eq__(self, other:any) -> bool:
        if isinstance(other, Resistor):
            return super().__eq__(other) and self.r == other.r
        return False

    def __str__(self) -> str:
        return '{}{}={}'.format(self.id,(self.a, self.b), self.r)

    def __repr__(self) -> str:
        return 'Resistor\'{}\'{}'.format(self.id, (self.a, self.b, self.r))