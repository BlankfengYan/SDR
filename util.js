var inherit = function(proto) {
  function F() {}
  F.prototype = proto
  return new F
}
module.exports = {
	extend:function(Child, Parent) {
	  Child.prototype = inherit(Parent.prototype)
	  Child.prototype.constructor = Child
	  Child.parent = Parent.prototype
	}
};