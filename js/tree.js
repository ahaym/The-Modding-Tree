var dashboardTree = [
	["gap-1", "gap-2", "row", "gap-3", "gap-4"],
	["alg", "stat", "rel", "viz", "simd"],
	["qry", "gap-5", "sch", "gap-6", "vec"],
	["opt", "ds", "cat", "panel", "gap-7"],
	["gap-8", "met", "db", "gap-9", "exec"],
	["gap-10", "sem", "gap-11", "gap-12", "gap-13"],
	["gap-14", "gap-15", "gap-16", "dash", "gap-17"],
	["gap-18", "onto", "gap-19", "gap-20", "gap-21"],
]

var layoutInfo = {
    startTab: "row",
    startNavTab: "tree-tab",
	showTree: true,

    treeLayout: dashboardTree
}

for (let index = 1; index <= 21; index++) {
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
