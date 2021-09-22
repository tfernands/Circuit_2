import sys
import os

PACKAGE_PARENT = '..'
SCRIPT_DIR = os.path.dirname(os.path.realpath(os.path.join(os.getcwd(), os.path.expanduser(__file__))))
sys.path.append(os.path.normpath(os.path.join(SCRIPT_DIR, PACKAGE_PARENT)))

import unittest
from util import Queue, bmpAStar

class TestQueue(unittest.TestCase):

    def setUp(self):
        self.t1 = [23, 1, 3, 32, 7, 10]

    def test_initialize(self):
        queue = Queue()
        self.assertEqual(len(queue), 0)
        queue = Queue(self.t1)
        self.assertEqual(queue.queue, [1, 3, 7, 10, 23, 32])

    def test_put(self):
        queue = Queue()
        queue.put(10)
        queue.put(1)
        queue.put(4)
        self.assertEqual(len(queue), 3)
        self.assertEqual(queue.queue, [1, 4, 10])
        queue = Queue(self.t1)
        queue.put(20)
        queue.put(33)
        queue.put(0)
        self.assertEqual(queue.queue, [0, 1, 3, 7, 10, 20, 23, 32, 33])

    def test_get(self):
        queue = Queue()
        queue.put(10)
        self.assertEqual(queue.get(), 10)
        queue.put(11)
        self.assertEqual(queue.get(), 11)
        queue = Queue(self.t1)
        self.assertEqual(queue.get(), 1)
        self.assertEqual(queue.get(), 3)
        self.assertEqual(queue.get(), 7)
        self.assertEqual(queue.get(), 10)
        self.assertEqual(queue.get(), 23)
        self.assertEqual(queue.get(), 32)
        with  self.assertRaises(IndexError):
            queue.get()

class TestBmpAStar:
    pass

if __name__ == '__main__':
    from ascii2d import Ascii2D
    canvas = Ascii2D(30,7)
    A = (1, 1)
    B = (20, 6)
    obstacles = (0, 0)
    a = bmpAStar([(19,4),(19,5),(19,3),(19,2),(19,1),(19,0),(20,6)], A, B)
    if a:
        canvas.path(a)
    print(canvas)
    #unittest.main()