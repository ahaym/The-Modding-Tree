var dashboardTree = [
	["gap-1", "gap-2", "tup", "gap-3", "gap-4"],
	["alg", "stat", "rel", "viz", "simd"],
	["qry", "gap-5", "sch", "gap-6", "vec"],
	["opt", "ds", "cat", "panel", "gap-7"],
	["gap-8", "onto", "db", "gap-9", "exec"],
	["gap-10", "sem", "gap-11", "dash", "gap-12"],
]

var layoutInfo = {
    startTab: "tup",
    startNavTab: "tree-tab",
	showTree: true,

    treeLayout: dashboardTree
}

for (let index = 1; index <= 12; index++) {
	addNode("gap-" + index, {
		layerShown: "ghost",
	})
}

addLayer("tree-tab", {
    tabFormat: [["tree", function() {return (layoutInfo.treeLayout ? layoutInfo.treeLayout : TREE_LAYERS)}]],
    previousTab: "",
    leftTab: true,
    style() {return {'background-color': '#101417'}},
})
