/*jshint esversion: 6 */
class Node 
{
  constructor(data) {
    this.data = data;
    this.previous = null;
    this.next = null;
  }
}

class LinkedList
{
	constructor(...node) {
    this.first = null;
    this.last = null;
    if (node.length > 0) {
      for (let i = 0; i < node.length; i++)
        this.addLast(node[i]);
    }
	}
  add(node) {
    this.addLast(node);
  }
  addFirst(node) {
    if (this.count() >= 2) {
      let temp = this.first;
      this.first = new Node(node);
      this.first.next = temp;
      temp.previous = this.first;
    }
    else if (this.first == null) {
      this.first = new Node(node);
    }
    else {
      this.last = this.first;
      this.first = new Node(node);
      this.first.next = this.last;
      this.last.previous = this.first;
    }
  }
  addLast(node) {
    if (this.count() >= 2) {
      let temp = this.last;
      this.last = new Node(node);
      this.last.previous = temp;
      temp.next = this.last;
    }
    else if (this.first == null) {
      this.first = new Node(node);
    }
    else if (this.last == null) {
      this.last = new Node(node);
      this.last.previous = this.first;
      this.first.next = this.last;
    }
  }
  count() {
    if (this.first != null)
      return this.countRecur(this.first);
    else
      return 0;
  }
  countRecur(node) {
    if (node.next != null)
      return 1 + (this.countRecur(node.next));
    if (node.next == null)
      return 1;
  }
  contains(value) {
    if (this.first != null)
      return this.containsRecur(this.first, value);
    else
      return false;
  }
  containsRecur(node, value) {
    if (node.data == value) return true;
    else if (node.next != null) {
      if (this.containsRecur(node.next, value)) return true;
    }
    else return false;
  }
  remove(value) {
    if (this.first != null) {
      if (this.first.data == value)
        this.removeFirst();
      else if (this.last.data == value)
        this.removeLast();
      else {
        var it = nodeNextGen(this.first);
        var x = it.next();
        while (!x.done) {
          if (x.value.data == value) {
            var left = x.value.previous;
            var right = x.value.next;
            x.value = null;
            left.next = right;
            right.previous = left;
            break;
          }
          x = it.next();
        }
      }
    }
  }
  removeFirstByCond(cond) {
    if (this.first != null) {
      if (cond(this.first.data))
        this.removeFirst();
      else if (cond(this.last.data))
        this.removeLast();
      else {
        var it = nodeNextGen(this.first);
        var x = it.next();
        while (!x.done) {
          if (cond(x.value.data)) {
            var left = x.value.previous;
            var right = x.value.next;
            x.value = null;
            left.next = right;
            right.previous = left;
            break;
          }
          x = it.next();
        }
      }
    }
  }
  removeAllByCond(cond) {
    if (this.first != null) 
      this.RABC_assist(this.first, cond);
  }
  RABC_assist(node, cond) {
    if (node.next != null)
      this.RABC_assist(node.next, cond);
    if (cond(node)) {
      if (node == this.first)
        this.removeFirst();
      else if (node == this.last)
        this.removeLast();
      else {
        node.previous.next = node.next;
        node.next.previous = node.previous;
        node = null;
      }
    }
  }
  removeFirst() {
    if (this.count() > 2) {          
      var temp = this.first.next;
      this.first = null;
      temp.previous = null;
      this.first = temp;
      temp = null;
    }
    else if (this.count() == 2) {
      this.first = this.last;
      this.first.previous = null;
      this.last = null;
    }
    else if (this.first != null)
      this.first = null;
  }
  removeLast() {
    if (this.count() > 2) {          
      var temp = this.last.previous;
      this.last = null;
      temp.next = null;
      this.last = temp;
      temp = null;
    }
    else if (this.count() == 2) {
      this.last = null;
      this.first.next = null;
    }
    else if (this.first != null)
      this.first = null;
  }
}

function* nodeNextGen(node) {
  var x = node;
  while(x != null) {
    yield x;
    x = x.next;
  }
}
/*
// TESTS

let list = new LinkedList(2, 3, 4);
    list.addFirst(1);
let empty = new LinkedList();
let one = new LinkedList();
one.addLast(1);
console.assert(empty.count() == 0);
console.assert(one.count() == 1);
console.assert(list.count() == 4);
console.assert(list.first.data == 1);
console.assert(list.first.next.data == 2);
console.assert(list.first.next.next.data == 3);
console.assert(list.last.data == 4);

class Test 
{
  constructor(name, key) {
    this.name = name;
    this.key = key;
  }
}

let objList = new LinkedList(new Test('one', 1), new Test('two', 2), 
  new Test('trash', 0), new Test('three', 3), new Test('four', 4));

objList.removeFirstByCond(x => x.name == "trash");
objList.removeAllByCond(x => x.data.key > 2);
*/
/*
Working generator

function* iter() {
  var x = 1;
  while (x <= 10) {
    yield x++;
  }
}

var it = iter();

var x = it.next();
while(!x.done) {
  console.log(x.value);
  x = it.next();
}
*/

/*
EXAMPLE function/cycle for nodeNextGen()

function gen(list) {
  var it = nodeNextGen(list.first);
  var x = it.next();
  while (!x.done) {
    console.log(x.value);
    x = it.next();
  }
}
*/