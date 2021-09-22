import os, sys

PACKAGE_PARENT = '..'
SCRIPT_DIR = os.path.dirname(os.path.realpath(os.path.join(os.getcwd(), os.path.expanduser(__file__))))
sys.path.append(os.path.normpath(os.path.join(SCRIPT_DIR, PACKAGE_PARENT)))

import unittest
from circuit import Circuit
from circuit_components import Resistor as R
from circuit_components import Edge as E

class TestEdge(unittest.TestCase):

    def test_basics(self):
        with self.assertRaises(ReferenceError):
            e = E('A','A')
        e = E('A','B')
        # same_node(e1, e2)
        self.assertTrue(E.same_nodes(E('B', 'A'), E('B', 'A')))
        self.assertTrue(E.same_nodes(E('A', 'B'), E('B', 'A')))
        self.assertFalse(E.same_nodes(E('A', 'B'), E('C', 'A')))

    def test_edge_hash(self):
        self.assertEqual(E('A', 'B', id='e1').__hash__(), E('A', 'B', id='e1').__hash__())
        self.assertEqual(E('A', 'B', id='e1').__hash__(), E('B', 'A', id='e1').__hash__())
        self.assertNotEqual(E('A', 'B').__hash__(), E('A', 'B').__hash__())
        self.assertNotEqual(E('A', 'C',id='e1').__hash__(), E('A', 'B',id='e1').__hash__())

    def test_edge_equal(self):
        self.assertEqual(E('A', 'B', id='e1'), E('A', 'B', id='e1'))
        self.assertEqual(E('A', 'B', id='e2'), E('B', 'A', id='e2'))
        self.assertNotEqual(E('A', 'B'), E('A', 'B'))
        self.assertNotEqual(E('A', 'B', id='e1'), E('A', 'C', id='e1'))
        self.assertNotEqual(E('A', 'B'), E('C', 'A'))

    def test_getitem_(self):
        e = E('A', 'B', id='e1')
        with self.assertRaises(KeyError):
            e['C']
        self.assertEqual(e['A'], 'B')
        self.assertEqual(e['B'], 'A')

class TestResistor(unittest.TestCase):

    def test_edge_hash(self):
        self.assertEqual(R('A', 'B', 1, id='r1').__hash__(), R('A', 'B', 1, id='r1').__hash__())
        self.assertEqual(R('B', 'A', 3, id='r1').__hash__(), R('A', 'B', 3, id='r1').__hash__())
        self.assertNotEqual(R('A', 'B', 1, id='r1').__hash__(), R('A', 'B', 1, id='r2').__hash__())
        self.assertNotEqual(R('A', 'B', 1, id='r1').__hash__(), R('A', 'B', 2, id='r1').__hash__())
        self.assertNotEqual(R('A', 'C', 1, id='r1').__hash__(), R('A', 'B', 1, id='r1').__hash__())

    def test_edge_equal(self):
        self.assertEqual(R('A', 'B', 1, id='r1'), R('A', 'B', 1, id='r1'))
        self.assertNotEqual(R('A', 'B', 2), R('A', 'B', 2))
        self.assertNotEqual(R('A', 'B', 1), R('A', 'C', 1))
        self.assertNotEqual(R('A', 'B', 1, id='r1'), R('A', 'B', 2, id='r1'))

    def test_getitem_(self):
        r1 = R('A', 'B', 1)
        with self.assertRaises(KeyError):
            r1['C']
        self.assertEqual(r1['A'], 'B')
        self.assertEqual(r1['B'], 'A')

if __name__ == '__main__':
    unittest.main()