import os, sys



PACKAGE_PARENT = '..'
SCRIPT_DIR = os.path.dirname(os.path.realpath(os.path.join(os.getcwd(), os.path.expanduser(__file__))))
sys.path.append(os.path.normpath(os.path.join(SCRIPT_DIR, PACKAGE_PARENT)))

import unittest
from test_components import *
from circuit import Circuit
from circuit_components import Resistor as R
from circuit_components import Edge as E

circuits = {
    # Simple 1 resistor req(A,B)=2
    # A--r1--B
    'c1': Circuit([
        R('A','B',2,'r1'),  
    ]),
    # Series req(A,C)=3
    # A---r1---B---r2---C 
    'c2': Circuit([
        R('A','B',1,'r1'),
        R('B','C',2,'r2'),
    ]),
    # Parallel req(A,B)=1
    # A---r1---B 
    # |---r2---|
    'c3': Circuit([
        R('A','B',2,'r1'),
        R('A','B',2,'r2'),
    ]),
    # Parallel with 3 resistors req(A,B)=4
    # A---r1---B
    # |---r2---|
    # |---r3---|
    'c4': Circuit([
        R('A','B',7,'r1'),
        R('A','B',12,'r2'),
        R('A','B',42,'r3'),
    ]),
    # Parallel and series req(A,C)=3
    # A---r1---B---r2---C
    #          |---r3---|
    'c5': Circuit([
        R('A','B',1,'r1'),
        R('B','C',3,'r2'),
        R('B','C',6,'r3'),
    ]),
    # desconected ends 
    # A---r1---B---r2---C
    #          | 
    #          r3
    #          |
    #          D
    'c6': Circuit([
        R('A', 'B', 1, 'r1'),
        R('B', 'C', 2, 'r2'),
        R('B', 'D', 3, 'r3'),
    ]),
    # all combined
    # A---r1---B---r2---C---r3---D
    #          |        |---r4---|
    #          r5
    #          |
    #          C
    'c7': Circuit([
        R('A','B',1,'r1'),
        R('B','C',3,'r2'),
        R('C','D',6,'r3'),
        R('C','D',6,'r4'),
        R('B','E',6,'r5'),
    ]),
    # delta
    'c8': Circuit([
        R('A','C',70,'r1'),
        R('C','D',20,'r2'),
        R('C','E',50,'r3'),
        R('E','D',30,'r4'),
        R('E','F',10,'r5'),
        R('D','F',40,'r6'),
        R('B','F',60,'r7'),
    ])
}
results = {
    'c1': {
        ('A','B'): {'req':2},
    },
    'c2': {
        ('A','B'): {'req':1},
        ('B','C'): {'req':2},
        ('A','C'): {'req':3},
    },
    'c3': {
        ('A','B'): {'req':1},
    },
    'c4': {
        ('A','B'): {'req':4},
    },
    'c5': {
        ('A','B'): {'req':1},
        ('B','C'): {'req':2},
        ('A','C'): {'req':3},
    },
    'c6': {
        ('A','B'): {'req':1},
        ('B','C'): {'req':2},
        ('B','D'): {'req':3},
        ('A','C'): {'req':3},
        ('A','D'): {'req':4},
        ('C','D'): {'req':5},
    },
    'c7': {
        ('A','B'): {'req':1},
        ('B','C'): {'req':3},
        ('C','D'): {'req':3},
        ('B','E'): {'req':6},
        ('A','C'): {'req':4},
        ('A','E'): {'req':7},
        ('B','D'): {'req':6},
        ('D','E'): {'req':12},
    },
    'c8': {
        ('A','B'): {'req':156.197183098591},
    },
}

class TestCircuit(unittest.TestCase):

    @staticmethod
    def edge_id_in_list(id, edges):
        for e in edges:
            if e.id == id:
                return True
        return False

    def test_nodes(self):
        self.assertEqual(circuits['c1'].nodes(), {'A','B'})
        self.assertEqual(circuits['c2'].nodes(), {'A','B','C'})
        self.assertEqual(circuits['c7'].nodes(), {'A','B','C','D','E'})

    def test_find_edges_with_node(self):
        ids = [e.id for e in circuits['c1'].find_edges_with_node('A')]
        self.assertEqual(len(ids), 1)
        self.assertIn('r1',ids)
        ids = [e.id for e in circuits['c4'].find_edges_with_node('B')]
        self.assertEqual(len(ids), 3)
        self.assertIn('r1',ids)
        self.assertIn('r2',ids)
        self.assertIn('r3',ids)
        ids = [e.id for e in circuits['c7'].find_edges_with_node('B')]
        self.assertEqual(len(ids), 3)
        self.assertIn('r1',ids)
        self.assertIn('r2',ids)
        self.assertIn('r5',ids)

    def test_find_edges(self):
        ids = [e.id for e in circuits['c1'].find_edges('A','B')]
        self.assertEqual(len(ids), 1)
        self.assertIn('r1',ids)
        ids = [e.id for e in circuits['c4'].find_edges('A','B')]
        self.assertEqual(len(ids), 3)
        self.assertIn('r1',ids)
        self.assertIn('r2',ids)
        self.assertIn('r3',ids)
        ids = [e.id for e in circuits['c7'].find_edges('D','C')]
        self.assertEqual(len(ids), 2)
        self.assertIn('r3',ids)
        self.assertIn('r4',ids)

    def test_subgraph(self):
        ids = [e.id for e in circuits['c1'].subgraph('A','B')]
        self.assertEqual(len(ids), 1)
        self.assertIn('r1',ids)
        ids = [e.id for e in circuits['c2'].subgraph('A','B')]
        self.assertEqual(len(ids), 1)
        self.assertIn('r1',ids)
        ids = [e.id for e in circuits['c4'].subgraph('A','B')]
        self.assertEqual(len(ids), 3)
        self.assertIn('r1',ids)
        self.assertIn('r2',ids)
        self.assertIn('r3',ids)
        ids = [e.id for e in circuits['c6'].subgraph('A','C')]
        self.assertEqual(len(ids), 2)
        self.assertIn('r1',ids)
        self.assertIn('r2',ids)
        ids = [e.id for e in circuits['c6'].subgraph('A','D')]
        self.assertEqual(len(ids), 2)
        self.assertIn('r1',ids)
        self.assertIn('r3',ids)
        ids = [e.id for e in circuits['c7'].subgraph('A','C')]
        self.assertEqual(len(ids), 2)
        self.assertIn('r1',ids)
        self.assertIn('r2',ids)
        ids = [e.id for e in circuits['c7'].subgraph('A','D')]
        self.assertEqual(len(ids), 4)
        self.assertIn('r1',ids)
        self.assertIn('r2',ids)
        self.assertIn('r3',ids)
        self.assertIn('r4',ids)
        ids = [e.id for e in circuits['c7'].subgraph('D','E')]
        self.assertEqual(len(ids), 4)
        self.assertIn('r3',ids)
        self.assertIn('r4',ids)
        self.assertIn('r2',ids)
        self.assertIn('r5',ids)
        ids = [e.id for e in circuits['c7'].subgraph('A','E')]
        self.assertEqual(len(ids), 2)
        self.assertIn('r1',ids)
        self.assertIn('r5',ids)
        ids = [e.id for e in circuits['c8'].subgraph('A','B')]
        self.assertEqual(len(ids), 7)

    def test_resistence(self):
        for circuit_name in results:
            circuit = circuits[circuit_name]
            res = results[circuit_name]
            for a, b in res:
                self.assertAlmostEqual(circuit.req(a, b), res[(a, b)]['req'])


if __name__ == '__main__':
    unittest.main()