from math import floor, ceil

L, R, U, D = 1, 2, 4, 8
DIR_CHAR = { 0:'e',
	L:'─',R:'─',U:'│',D:'│',
	L|U: '┘', L|D: '┐', R|D: '┌', R|U: '└',
	L|U|D: '┤', U|L|R: '┴', D|L|R: '┬', U|D|R: '├',
	L|R: '─', U|D: '│', L|R|U|D: '┼',
}

class Ascii2D:

	w: int
	h: int
	display_border: bool
	name: str
	_buffer: list
	_paths: dict

	def __init__(self, w: int, h: int, name:str = 'Ascii2D', display_border: bool = True):
		self.w = w
		self.h = h 
		self.name = name if name else ''
		self.display_border = display_border
		self._buffer = [[' ']*w for _ in range(h)]
		self._paths = dict()

	def _solve_border_code(self, p0:tuple, p:tuple, p1:tuple=None) -> int:
		if p1 is None:
			if p[0] != p0[0] and p[1] == p0[1]:
				return L|R
			elif p[0] == p0[0] and p[1] != p0[1]:
				return U|D
			return 0
		code = 0
		if (p[0] > p0[0] and p[1] == p0[1]) or (p[0] > p1[0] and p[1] == p1[1]) :
			code|=L 
		if (p[0] < p0[0] and p[1] == p0[1]) or (p[0] < p1[0] and p[1] == p1[1]):
			code|=R
		if (p[1] > p0[1] and p[0] == p0[0]) or (p[1] > p1[1] and p[0] == p1[0]):
			code|=U
		if (p[1] < p0[1] and p[0] == p0[0]) or (p[1] < p1[1] and p[0] == p1[0]):
			code|=D
		return code

	def _get_points_between(self, p1:tuple, p2:tuple, diagonal:bool=False) -> list:
		delta = p2[0]-p1[0], p2[1]-p1[1]
		steps = int(max(abs(delta[0]), abs(delta[1])))
		if steps == 0:
			return []
		dx, dy = delta[0]/steps, delta[1]/steps
		x, y = None, None
		for i in range(1, steps):
			px, py = x, y
			x = p1[0]+round(i*dx)
			y = p1[1]+round(i*dy)
			if not diagonal and px and x != px and y != py:
				yield px, y
			yield x, y

	def _get_path_points(self, path: [tuple, list]) -> list:
		if len(path) == 1:
			return path
		t_path = None
		for i in range(len(path)-1):
			p0 = path[i]
			p1 = path[i+1]
			if abs(p1[0]-p0[0]) > 1 or abs(p1[1]-p0[1]) > 0:
				if t_path is None:
					t_path = path[:i+1]
				t_path.extend(self._get_points_between(p0, p1, diagonal=False))
				t_path.append(p1)
			elif t_path:
				t_path.append(p1)
		if t_path is None:
			return path
		return t_path

	def pixel(self, char:chr, x:[int, tuple], y:int = None) -> None:
		x, y = x if y is None else (x, y)
		if not isinstance(x, int) or not isinstance(y, int):
			raise TypeError('x and y must be integers')
		if y >= 0 and y < self.h and x >= 0 and x < self.w:
			if len(char) != 1:
				raise ValueError('char argument must have len = 1.')
			self._buffer[y][x] = char

	def fill(self, char:chr, pixels:[list, tuple] = None) -> None:
		if len(char) != 1:
			raise ValueError('char argument must have len = 1.')
		if pixels is not None:
			for p in pixels:
				self.pixel(char, p)
		else:
			for x in range(self.w):
				for y in range(self.h):
					self._buffer[y][x] = char

	def text(self, text:str, x:[int, tuple], y:int = None) -> None:
	 	x, y = x if y is None else (x, y)
	 	if y >= 0 and y < self.h:
	 		for x_ in range(max(0, x), min(self.w, len(text)+x)):
	 			self._buffer[y][x_] = text[x_-x]

	def line(self, char: chr, p1: tuple, p2: tuple, diagonal:bool=True) -> None:
		self.pixel(char, p1)
		self.pixel(char, p2)
		for p in self._get_points_between(p1, p2, diagonal):
			self.pixel(char, p)

	def path(self, path: [tuple, list], id=None) -> None:
		path = self._get_path_points(path)
		if len(path) == 1:
			self.pixel('*', path[0])
			return
		if id and id in self._paths:
			codes = self._paths[id]
			for p in path:
				if p not in codes:
					codes[p] = 0
		else:
			codes = {p:0 for p in path}
		if path[0] == path[-1]:
			codes[path[0]]|= self._solve_border_code(path[-2],path[0],path[1])
			codes[path[-1]]|= codes[path[0]]
		else:
			codes[path[0]]|= self._solve_border_code(path[0],path[1])
			codes[path[-1]]|= self._solve_border_code(path[-2],path[-1])
		for i in range(1, len(path)-1):
			codes[path[i]]|=self._solve_border_code(path[i-1],path[i],path[i+1])
			self.pixel(DIR_CHAR[codes[path[i]]], path[i])
		self.pixel(DIR_CHAR[codes[path[0]]], int(path[0][0]), int(path[0][1]))
		self.pixel(DIR_CHAR[codes[path[-1]]], int(path[-1][0]), int(path[-1][1]))
		if id:
			self._paths[id] = codes

	def canvas(self, canvas:'Ascii2D', x: [int, tuple], y: int = None, mask_chr:chr=' ') -> None:
		x, y = x if y is None else (x, y)
		for i in range(max(0, -y), canvas.h):
			for j in range(max(0, -x), canvas.w):
				if canvas._buffer[i][j] != mask_chr:
					self.pixel(canvas._buffer[i][j], j+x, i+y)

	def __str__(self):
		string = ''
		if self.display_border:
			string += ' '+'_'+self.name+'_'*self.w+'\n'
			if len(string) > self.w+2:
				string = string[:self.w+1]+'\n'
		for l in self._buffer:
			if self.display_border:
				string += '│'
			string += ''.join(l)
			if self.display_border:
				string += '│\n'
			else:
				string += '\n'
		if self.display_border:
			string = string[:-1]+'\n└'+'─'*self.w+'┘'
		return string

if __name__ == '__main__':

	p1 = [(3,1),(4,1),(5,1),(6,1),(7,1),(7,0),(8,0),(9,0),(10,0),(10,2),(3,3),(3,1)]
	canvas = Ascii2D(50, 7)
	canvas.path(p1, 'a')
	canvas.path(list(map(lambda a: (a[1]*2+10,a[0]//2), p1)), 'b')
	canvas.path(list(map(lambda a: (a[0],a[1]+2), p1)),'a')

	c2 = Ascii2D(10, 4)
	c2.line('#', (0,0),(10, 10))
	canvas.canvas(c2, 10, 1)
	print(c2)
	print(canvas)
